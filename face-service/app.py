from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import os
import numpy as np
from PIL import Image
import io
import cv2
import random
import pickle
import psycopg2
import redis

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024

# ─── Configuration ───
FACES_DIR = 'faces'
os.makedirs(FACES_DIR, exist_ok=True)

PG_CONFIG = {
    'host':     os.environ.get('PG_HOST',     'localhost'),
    'port':     int(os.environ.get('PG_PORT', 5432)),
    'database': os.environ.get('PG_DATABASE', 'smart_attendance_faces'),
    'user':     os.environ.get('PG_USER',     'postgres'),
    'password': os.environ.get('PG_PASSWORD', ''),
}

REDIS_URL         = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
COSINE_THRESHOLD  = 0.35
MINIFAS_THRESHOLD = 0.20   # real_prob bu degerin ustundeyse gercek yuz

# ─── Load InsightFace ───
print("Loading InsightFace model...")
import insightface
from insightface.app import FaceAnalysis

face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))
print("InsightFace model loaded.")

# ─── Load MiniFASNet (uniface) ───
minifas_model = None
try:
    from uniface import MiniFASNet
    minifas_model = MiniFASNet()
    print("MiniFASNet anti-spoofing model loaded.")
except Exception as e:
    print(f"MiniFASNet not available: {e}")

# ─── Redis ───
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=False)
    redis_client.ping()
    print("Redis connected.")
    REDIS_AVAILABLE = True
except Exception as e:
    print(f"Redis not available: {e}")
    redis_client   = None
    REDIS_AVAILABLE = False

# ─── PostgreSQL ───
def get_pg_connection():
    return psycopg2.connect(**PG_CONFIG)

try:
    _c = get_pg_connection(); _c.close()
    print("PostgreSQL connected.")
except Exception as e:
    print(f"PostgreSQL error: {e}")

print("\n=== All systems ready ===\n")

# ─── Challenges ───

REGISTRATION_CHALLENGES = [
    {'id': 'look_straight', 'instruction': 'Look straight at the camera'},
    {'id': 'turn_left',     'instruction': 'Please turn your head to the left'},
    {'id': 'turn_right',    'instruction': 'Please turn your head to the right'},
]

VERIFICATION_CHALLENGES = [
    {'id': 'smile',          'instruction': 'Please smile at the camera'},
    {'id': 'raise_eyebrows', 'instruction': 'Please raise your eyebrows'},
    {'id': 'turn_left',      'instruction': 'Please turn your head to the left'},
    {'id': 'turn_right',     'instruction': 'Please turn your head to the right'},
    {'id': 'close_eyes',     'instruction': 'Please close your eyes for a moment'},
]

# ─── Core ───

def base64_to_image(b64):
    if ',' in b64:
        b64 = b64.split(',')[1]
    return Image.open(io.BytesIO(base64.b64decode(b64)))

def save_image(img, path):
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img.save(path)

def detect_faces_insight(img_array):
    bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    return face_app.get(bgr)

def get_embedding(img_array):
    faces = detect_faces_insight(img_array)
    if len(faces) == 0:
        return None, "No face detected."
    if len(faces) > 1:
        return None, "Multiple faces detected."
    return faces[0].embedding, "OK"

# ─── Anti-Spoofing: MiniFASNet ───

def check_minifas(img_array):
    """
    MiniFASNet ile ekran/fotograf/video tespiti.
    Gercek yuz: label=1, spoof: label=0 veya 2
    Karar: real_prob (sinif 1 olasiligi) esige gore
    """
    if minifas_model is None:
        return True, 1.0, 'OK'
    try:
        bgr   = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        faces = detect_faces_insight(img_array)
        if len(faces) == 0:
            return True, 0.5, 'OK'  # yuz yoksa gecir, quality check yakalar

        bbox         = faces[0].bbox.astype(int)
        input_tensor = minifas_model.preprocess(bgr, bbox)
        outputs      = minifas_model.session.run(
            [minifas_model.output_name],
            {minifas_model.input_name: input_tensor}
        )[0]

        # Softmax
        e_x   = np.exp(outputs - np.max(outputs, axis=1, keepdims=True))
        probs = e_x / e_x.sum(axis=1, keepdims=True)

        real_prob = float(probs[0, 1]) if probs.shape[1] > 1 else 0.5
        label     = int(np.argmax(probs))

        print(f'[MiniFAS] probs={np.round(probs[0], 4)}, label={label}, real_prob={real_prob:.4f}')

        is_real = real_prob > MINIFAS_THRESHOLD

        if not is_real:
            return False, real_prob, 'Spoof detected. Please use your real face, not a screen, photo, or video.'

        return True, real_prob, 'OK'

    except Exception as e:
        print(f'[MiniFAS] Error: {e}')
        return True, 1.0, 'OK'

# ─── Anti-Spoofing: Skin Color (YCrCb) ───

def check_skin_color(img_array):
    """
    Ekrandan yayilan ten rengi gercek tenden farklidir.
    YCrCb uzayinda Cr/Cb standart sapma analizi.
    Cok dar dagilim => ekran/fotograf
    """
    try:
        faces = detect_faces_insight(img_array)
        if len(faces) == 0:
            return True, 1.0, 'OK'

        bbox = faces[0].bbox.astype(int)
        x1, y1, x2, y2 = bbox
        h, w = img_array.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)

        roi = img_array[y1:y2, x1:x2]
        if roi.size == 0:
            return True, 1.0, 'OK'

        ycrcb = cv2.cvtColor(roi, cv2.COLOR_RGB2YCrCb)
        Cr    = ycrcb[:, :, 1].flatten().astype(float)
        Cb    = ycrcb[:, :, 2].flatten().astype(float)

        skin_mask  = (Cr > 133) & (Cr < 173) & (Cb > 77) & (Cb < 127)
        skin_ratio = np.sum(skin_mask) / max(len(skin_mask), 1)
        cr_std     = np.std(Cr)
        cb_std     = np.std(Cb)

        print(f'[SkinColor] skin_ratio={skin_ratio:.3f}, cr_std={cr_std:.2f}, cb_std={cb_std:.2f}')

        spoof = 0.0
        if skin_ratio < 0.10:
            spoof += 0.5   # ten rengi hic yok
        if cr_std < 5.0:
            spoof += 0.3   # renk cok tekdüze
        if cb_std < 5.0:
            spoof += 0.3

        print(f'[SkinColor] spoof_score={spoof:.2f}')

        if spoof >= 0.7:
            return False, spoof, 'Unnatural skin color detected. Please use your real face.'

        return True, 1.0, 'OK'

    except Exception as e:
        print(f'[SkinColor] Error: {e}')
        return True, 1.0, 'OK'

# ─── Tum Anti-Spoof Kontrollerini Calistir ───

def run_antispoof(img_array, context=''):
    # Katman 1: MiniFASNet (ana koruma)
    ok, score, msg = check_minifas(img_array)
    if not ok:
        print(f'[{context}] BLOCKED by MiniFASNet (real_prob={score:.4f})')
        return False, msg

    # Katman 2: Skin color (yedek katman)
    ok, score, msg = check_skin_color(img_array)
    if not ok:
        print(f'[{context}] BLOCKED by SkinColor (score={score:.2f})')
        return False, msg

    print(f'[{context}] Anti-spoof PASSED.')
    return True, 'OK'

# ─── Liveness: Multi-Frame Micro-Movement ───

def get_normalized_landmarks(img_array):
    faces = detect_faces_insight(img_array)
    if len(faces) == 0:
        return None, None
    face = faces[0]
    if face.landmark_2d_106 is None:
        return None, None
    bbox = face.bbox.astype(float)
    x1, y1, x2, y2 = bbox
    w, h = x2 - x1, y2 - y1
    if w < 1 or h < 1:
        return None, None
    lm  = face.landmark_2d_106.copy()
    nm  = np.zeros_like(lm)
    nm[:, 0] = (lm[:, 0] - x1) / w
    nm[:, 1] = (lm[:, 1] - y1) / h
    return nm, face.det_score

def check_micro_movement(frames_base64):
    if len(frames_base64) < 3:
        return False, 'Not enough frames for liveness check.'

    landmarks_list = []
    det_scores     = []

    for b64 in frames_base64:
        try:
            img  = base64_to_image(b64)
            arr  = np.array(img)
            lm, sc = get_normalized_landmarks(arr)
            if lm is None:
                return False, 'Face not detected in liveness frames.'
            landmarks_list.append(lm)
            det_scores.append(sc)
        except Exception:
            return False, 'Error processing liveness frames.'

    avg_det = np.mean(det_scores)
    if avg_det < 0.35:
        return False, 'Face detection quality too low.'

    stacked       = np.array(landmarks_list)
    variances     = np.var(stacked, axis=0)
    mean_var      = np.mean(variances)
    per_lm_var    = np.sum(variances, axis=1)
    var_of_var    = np.var(per_lm_var)

    print(f'[Liveness] mean_var={mean_var:.8f}, var_of_var={var_of_var:.12f}, avg_det={avg_det:.4f}')

    # Cok dusuk esik — gerçek yuz neredeyse her zaman gecer
    is_alive = mean_var > 0.000003 or var_of_var > 0.0000000003

    if not is_alive:
        return False, 'No natural movement detected. Please move slightly and try again.'

    return True, 'OK'

# ─── Face Quality ───

def check_face_quality(img_array, is_register=False):
    faces = detect_faces_insight(img_array)
    if len(faces) == 0:
        return False, 'No face detected.'
    if len(faces) > 1:
        return False, 'Multiple faces detected. Please ensure only one face is visible.'
    face  = faces[0]
    bbox  = face.bbox.astype(int)
    x1, y1, x2, y2 = bbox
    ih, iw = img_array.shape[:2]
    ratio  = ((x2 - x1) * (y2 - y1)) / (iw * ih)
    if ratio < 0.04:
        return False, 'Please move closer to the camera.'
    thresh = 0.4 if is_register else 0.45
    if face.det_score < thresh:
        return False, 'Face not clear enough. Please improve lighting.'
    return True, 'OK'

# ─── Challenge Detection ───

def detect_challenge(img_array, challenge_id):
    try:
        faces = detect_faces_insight(img_array)
        if len(faces) == 0:
            return False

        face  = faces[0]
        bbox  = face.bbox.astype(int)
        x1, y1, x2, y2 = bbox
        fw, fh = x2 - x1, y2 - y1
        fcx    = (x1 + x2) // 2
        ih, iw = img_array.shape[:2]
        ratio  = (fw * fh) / (iw * ih)
        lm     = face.landmark_2d_106

        if challenge_id == 'look_straight':
            offset = abs(fcx - iw // 2) / iw
            return offset < 0.2 and ratio > 0.06

        elif challenge_id == 'turn_left':
            if lm is not None and len(lm) > 93:
                nose, leye, reye = lm[86], lm[35], lm[93]
                nl = abs(nose[0] - leye[0])
                nr = abs(nose[0] - reye[0])
                result = nl < nr * 0.8 and ratio > 0.04
                print(f'[Challenge] turn_left: nl={nl:.1f}, nr={nr:.1f}, ratio={ratio:.3f} => {result}')
                return result
            return (fcx - iw // 2) / iw < -0.05 and ratio > 0.04

        elif challenge_id == 'turn_right':
            if lm is not None and len(lm) > 93:
                nose, leye, reye = lm[86], lm[35], lm[93]
                nl = abs(nose[0] - leye[0])
                nr = abs(nose[0] - reye[0])
                result = nr < nl * 0.8 and ratio > 0.04
                print(f'[Challenge] turn_right: nl={nl:.1f}, nr={nr:.1f}, ratio={ratio:.3f} => {result}')
                return result
            return (fcx - iw // 2) / iw > 0.05 and ratio > 0.04

        elif challenge_id == 'smile':
            gray   = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            sc     = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
            roi    = gray[y1:y2, x1:x2]
            if roi.size == 0:
                return False
            smiles = sc.detectMultiScale(roi, 1.7, 18)
            result = len(smiles) > 0 and ratio > 0.05
            print(f'[Challenge] smile: smiles={len(smiles)}, ratio={ratio:.3f} => {result}')
            return result

        elif challenge_id == 'raise_eyebrows':
            # Kas kaldirildiginda alın bolgesinde piksel yogunlugu degisir
            # Landmark tabanli: kas-goz arasi mesafe artar
            if lm is not None and len(lm) > 43:
                # Sol kas ustu (lm[43]), sol goz merkezi (lm[35])
                # Sag kas ustu (lm[96 ya da 50 civar]), sag goz merkezi (lm[93])
                left_brow  = lm[43][1]  # sol kas
                left_eye   = lm[35][1]  # sol goz
                right_brow = lm[50][1] if len(lm) > 50 else lm[43][1]
                right_eye  = lm[93][1] if len(lm) > 93 else lm[35][1]
                brow_dist  = ((left_eye - left_brow) + (right_eye - right_brow)) / (2 * fh)
                result     = brow_dist > 0.12 and ratio > 0.05
                print(f'[Challenge] raise_eyebrows: brow_dist={brow_dist:.4f}, ratio={ratio:.3f} => {result}')
                return result
            return face.det_score > 0.5 and ratio > 0.06

        elif challenge_id == 'close_eyes':
            if lm is not None and len(lm) > 96:
                # Sol goz: 37 (ust), 41 (alt)
                # Sag goz: 89 (ust), 95 (alt)
                left_open  = abs(lm[41][1] - lm[37][1])
                right_open = abs(lm[95][1] - lm[89][1])
                openness   = (left_open + right_open) / (2 * fh)
                result     = openness < 0.018 and ratio > 0.04
                print(f'[Challenge] close_eyes: openness={openness:.4f}, fh={fh}, ratio={ratio:.3f} => {result}')
                return result
            return False

        return False

    except Exception as e:
        print(f'[Challenge] Error ({challenge_id}): {e}')
        return False

# ─── PostgreSQL ───

def cosine_distance(e1, e2):
    dot = np.dot(e1, e2)
    n   = np.linalg.norm(e1) * np.linalg.norm(e2)
    return 1.0 - dot / n if n > 0 else 1.0

def save_embedding_pg(student_uuid, embedding, step):
    emb_bytes = pickle.dumps(embedding)
    try:
        conn = get_pg_connection()
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO face_embeddings (student_uuid, step, embedding)
            VALUES (%s, %s, %s)
            ON CONFLICT (student_uuid, step)
            DO UPDATE SET embedding = %s, created_at = CURRENT_TIMESTAMP
        """, (student_uuid, step, emb_bytes, emb_bytes))
        conn.commit(); cur.close(); conn.close()
        if REDIS_AVAILABLE:
            redis_client.delete(f'emb:{student_uuid}')
            redis_client.delete('all_embeddings')
        return True
    except Exception as e:
        print(f'PG save error: {e}')
        return False

def get_embeddings_pg(student_uuid):
    key = f'emb:{student_uuid}'
    if REDIS_AVAILABLE:
        cached = redis_client.get(key)
        if cached:
            return pickle.loads(cached)
    try:
        conn = get_pg_connection()
        cur  = conn.cursor()
        cur.execute("SELECT embedding FROM face_embeddings WHERE student_uuid=%s ORDER BY step", (student_uuid,))
        rows = cur.fetchall(); cur.close(); conn.close()
        embs = [pickle.loads(r[0]) for r in rows]
        if REDIS_AVAILABLE and embs:
            redis_client.setex(key, 300, pickle.dumps(embs))
        return embs
    except Exception as e:
        print(f'PG get error: {e}')
        return []

def get_all_embeddings_pg():
    key = 'all_embeddings'
    if REDIS_AVAILABLE:
        cached = redis_client.get(key)
        if cached:
            return pickle.loads(cached)
    try:
        conn = get_pg_connection()
        cur  = conn.cursor()
        cur.execute("SELECT student_uuid, embedding FROM face_embeddings")
        rows   = cur.fetchall(); cur.close(); conn.close()
        result = {}
        for r in rows:
            result.setdefault(r[0], []).append(pickle.loads(r[1]))
        if REDIS_AVAILABLE:
            redis_client.setex(key, 120, pickle.dumps(result))
        return result
    except Exception as e:
        print(f'PG get all error: {e}')
        return {}

def delete_embeddings_pg(student_uuid):
    try:
        conn = get_pg_connection()
        cur  = conn.cursor()
        cur.execute("DELETE FROM face_embeddings WHERE student_uuid=%s", (student_uuid,))
        conn.commit(); cur.close(); conn.close()
        if REDIS_AVAILABLE:
            redis_client.delete(f'emb:{student_uuid}')
            redis_client.delete('all_embeddings')
        return True
    except Exception as e:
        print(f'PG delete error: {e}')
        return False

def check_duplicate_face(img_array, student_uuid):
    emb, _ = get_embedding(img_array)
    if emb is None:
        return False
    for uuid, emb_list in get_all_embeddings_pg().items():
        if uuid == student_uuid:
            continue
        for stored in emb_list:
            if cosine_distance(emb, stored) < COSINE_THRESHOLD:
                print(f'[Duplicate] Match with UUID: {uuid}')
                return True
    return False

def delete_student_faces(student_uuid):
    for i in range(len(REGISTRATION_CHALLENGES)):
        p = os.path.join(FACES_DIR, f'{student_uuid}_{i}.jpg')
        if os.path.exists(p):
            os.remove(p)
    old = os.path.join(FACES_DIR, f'{student_uuid}.jpg')
    if os.path.exists(old):
        os.remove(old)
    delete_embeddings_pg(student_uuid)

# ─── Routes ───

@app.route('/health', methods=['GET'])
def health():
    try:
        conn = get_pg_connection(); cur = conn.cursor()
        cur.execute("SELECT COUNT(DISTINCT student_uuid), COUNT(*) FROM face_embeddings")
        students, total = cur.fetchone(); cur.close(); conn.close()
    except:
        students, total = 0, 0
    return jsonify({
        'status': 'ok',
        'engine': 'InsightFace + MiniFASNet + SkinColor + MicroMovement',
        'minifas_loaded': minifas_model is not None,
        'minifas_threshold': MINIFAS_THRESHOLD,
        'registered_students': students,
        'total_embeddings': total,
        'redis': REDIS_AVAILABLE
    })

@app.route('/challenge', methods=['GET'])
def get_challenge_route():
    ctype   = request.args.get('type', 'verification')
    exclude = request.args.get('exclude', '')
    if ctype == 'registration':
        step = int(request.args.get('step', 0))
        return jsonify({'success': True, 'challenge': REGISTRATION_CHALLENGES[step % len(REGISTRATION_CHALLENGES)]})
    available = [c for c in VERIFICATION_CHALLENGES if c['id'] != exclude]
    if not available:
        available = VERIFICATION_CHALLENGES
    # Onceki challenge ile ayni olmasin diye shuffle yap
    random.shuffle(available)
    return jsonify({'success': True, 'challenge': available[0]})

@app.route('/register', methods=['POST'])
def register_face():
    try:
        data         = request.get_json()
        uuid         = data.get('student_uuid')
        image_b64    = data.get('image')
        challenge_id = data.get('challenge_id')
        step         = int(data.get('step', 0))
        lv_frames    = data.get('liveness_frames', [])

        if not uuid or not image_b64 or not challenge_id:
            return jsonify({'success': False, 'message': 'student_uuid, image and challenge_id required.'}), 400

        img  = base64_to_image(image_b64)
        arr  = np.array(img)

        # 1. Liveness
        if len(lv_frames) < 3:
            return jsonify({'success': False, 'message': 'Liveness frames required (min 3).', 'liveness_failed': True}), 400
        ok, msg = check_micro_movement(lv_frames)
        if not ok:
            return jsonify({'success': False, 'message': msg, 'liveness_failed': True}), 400

        # 2. Anti-spoof — ilk 2 liveness frame uzerinde
        for b64 in lv_frames[:2]:
            f_arr = np.array(base64_to_image(b64))
            ok, msg = run_antispoof(f_arr, context='Register')
            if not ok:
                return jsonify({'success': False, 'message': msg, 'liveness_failed': True}), 400

        # 3. Face quality
        ok, msg = check_face_quality(arr, is_register=True)
        if not ok:
            return jsonify({'success': False, 'message': msg, 'face_covered': True}), 400

        # 4. Challenge
        detected = detect_challenge(arr, challenge_id)
        print(f'[Register] Challenge {challenge_id}: detected={detected}')
        if not detected:
            return jsonify({'success': False, 'message': f'Challenge not completed: {challenge_id}', 'challenge_failed': True}), 400

        # 5. Embedding
        emb, emsg = get_embedding(arr)
        if emb is None:
            return jsonify({'success': False, 'message': emsg}), 400

        # 6. Duplicate
        if check_duplicate_face(arr, uuid):
            delete_student_faces(uuid)
            return jsonify({'success': False, 'message': 'This face belongs to another account.', 'duplicate_face': True}), 400

        # 7. Save
        save_image(img, os.path.join(FACES_DIR, f'{uuid}_{step}.jpg'))
        save_embedding_pg(uuid, emb, step)

        total_steps = len(REGISTRATION_CHALLENGES)
        is_complete = step >= total_steps - 1
        print(f'[Register] Step {step}/{total_steps-1} done for {uuid}. complete={is_complete}')

        return jsonify({
            'success':     True,
            'message':     'Face registered successfully.' if is_complete else f'Step {step+1} completed.',
            'is_complete': is_complete,
            'next_step':   step + 1 if not is_complete else None
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/verify', methods=['POST'])
def verify_face():
    try:
        data       = request.get_json()
        uuid       = data.get('student_uuid')
        lv_frames  = data.get('liveness_frames', [])
        challenges = data.get('challenges', [])

        if not uuid or len(challenges) < 2:
            return jsonify({'success': False, 'message': 'student_uuid and 2 challenges required.'}), 400

        stored = get_embeddings_pg(uuid)
        if not stored:
            return jsonify({'success': False, 'message': 'Face not registered. Please register first.'}), 404

        # 1. Liveness
        if len(lv_frames) < 3:
            return jsonify({'success': False, 'message': 'Liveness frames required (min 3).', 'liveness_failed': True}), 400
        ok, msg = check_micro_movement(lv_frames)
        if not ok:
            return jsonify({'success': False, 'message': msg, 'liveness_failed': True}), 400

        # 2. Anti-spoof — her iki challenge goruntusunde
        for i, ch in enumerate(challenges[:2]):
            ch_arr = np.array(base64_to_image(ch.get('image')))
            ok, msg = run_antispoof(ch_arr, context=f'Verify-ch{i+1}')
            if not ok:
                return jsonify({'success': False, 'message': msg, 'liveness_failed': True}), 400

        # 3. Challenge detection
        for i, ch in enumerate(challenges[:2]):
            ch_id  = ch.get('id')
            ch_img = ch.get('image')
            if not ch_id or not ch_img:
                return jsonify({'success': False, 'message': f'Challenge {i+1} data missing.'}), 400
            ch_arr   = np.array(base64_to_image(ch_img))
            detected = detect_challenge(ch_arr, ch_id)
            print(f'[Verify] Challenge {i+1} ({ch_id}): detected={detected}')
            if not detected:
                return jsonify({
                    'success':         False,
                    'message':         f'Challenge {i+1} ({ch_id}) not completed. Please try again.',
                    'challenge_failed': True
                }), 400

        # 4. Farkli challenge olmali
        if challenges[0]['id'] == challenges[1]['id']:
            return jsonify({'success': False, 'message': 'Both challenges are the same. Please try again.'}), 400

        # 5. Zaman kontrolu (max 10 sn)
        t1 = challenges[0].get('timestamp', 0)
        t2 = challenges[1].get('timestamp', 0)

        if t1 and t2:
            diff = (t2 - t1) / 1000
            print(f'[Verify] Challenge time diff: {diff:.1f}s')
            if diff > 10:
                 return jsonify({'success': False, 'message': 'Too slow. Please complete both challenges within 10 seconds.'}), 400


        # 6. Embedding eslesmesi
        last_arr = np.array(base64_to_image(challenges[-1]['image']))
        emb, emsg = get_embedding(last_arr)
        if emb is None:
            return jsonify({'success': False, 'message': emsg}), 400

        min_dist = min(cosine_distance(emb, s) for s in stored)
        verified = min_dist < COSINE_THRESHOLD

        print(f'[Verify] {uuid}: c1={challenges[0]["id"]}, c2={challenges[1]["id"]}, dist={min_dist:.4f}, verified={verified}')

        if verified:
            return jsonify({'success': True,  'verified': True,  'message': 'Face verified successfully.', 'distance': float(min_dist)})
        else:
            return jsonify({'success': False, 'verified': False, 'message': 'Face does not match.',        'distance': float(min_dist)})

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/delete', methods=['POST'])
def delete_face():
    try:
        uuid = request.get_json().get('student_uuid')
        if not uuid:
            return jsonify({'success': False, 'message': 'student_uuid required.'}), 400
        delete_student_faces(uuid)
        return jsonify({'success': True, 'message': 'Face deleted.'})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/check-challenge', methods=['POST'])
def check_challenge_route():
    try:
        data         = request.get_json()
        img          = base64_to_image(data.get('image', ''))
        arr          = np.array(img)
        ch           = data.get('challenge_id', '')
        student_uuid = data.get('student_uuid', None)

        # Birden fazla yuz
        faces = detect_faces_insight(arr)
        if len(faces) > 1:
            print(f'[CheckChallenge] Multiple faces: {len(faces)}')
            return jsonify({'success': True, 'detected': False, 'multiple_faces': True})

        # Anti-spoof
        ok, msg = run_antispoof(arr, context='CheckChallenge')
        if not ok:
            print(f'[CheckChallenge] Spoof detected')
            return jsonify({'success': True, 'detected': False, 'spoof': True})

        # Yanlis kisi kontrolu — sadece uuid varsa ve challenge detected olduysa
        if student_uuid:
            detected = detect_challenge(arr, ch)
            if detected:
                # Embedding karsilastir
                stored = get_embeddings_pg(student_uuid)
                if stored:
                    emb, emsg = get_embedding(arr)
                    if emb is not None:
                        min_dist = min(cosine_distance(emb, s) for s in stored)
                        print(f'[CheckChallenge] Identity check: dist={min_dist:.4f}')
                        if min_dist > COSINE_THRESHOLD:
                            print(f'[CheckChallenge] Wrong person detected!')
                            return jsonify({'success': True, 'detected': False, 'wrong_person': True})
            return jsonify({'success': True, 'detected': bool(detected)})

        return jsonify({'success': True, 'detected': bool(detect_challenge(arr, ch))})

    except Exception as e:
        return jsonify({'success': False, 'detected': False, 'message': str(e)}), 500


@app.route('/rebuild-embeddings', methods=['POST'])
def rebuild_embeddings_route():
    try:
        count = 0
        for f in os.listdir(FACES_DIR):
            if not f.endswith('.jpg'):
                continue
            parts = f.replace('.jpg', '').rsplit('_', 1)
            uuid  = parts[0]
            step  = int(parts[1]) if len(parts) == 2 else 0
            try:
                img = Image.open(os.path.join(FACES_DIR, f))
                emb, _ = get_embedding(np.array(img))
                if emb is not None:
                    save_embedding_pg(uuid, emb, step)
                    count += 1
            except Exception as e:
                print(f'Rebuild error {f}: {e}')
        return jsonify({'success': True, 'message': f'Rebuilt {count} embeddings.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/stats', methods=['GET'])
def stats():
    try:
        conn = get_pg_connection(); cur = conn.cursor()
        cur.execute("SELECT COUNT(DISTINCT student_uuid), COUNT(*) FROM face_embeddings")
        students, total = cur.fetchone(); cur.close(); conn.close()
        return jsonify({
            'success': True,
            'registered_students': students,
            'total_embeddings':    total,
            'face_images':         len([f for f in os.listdir(FACES_DIR) if f.endswith('.jpg')]),
            'engine':              'InsightFace + MiniFASNet + SkinColor + MicroMovement',
            'minifas_loaded':      minifas_model is not None,
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=os.environ.get('FLASK_ENV') == 'development')