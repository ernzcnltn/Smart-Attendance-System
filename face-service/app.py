from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import os
import numpy as np
from PIL import Image
import io
import cv2
import random

app = Flask(__name__)
CORS(app)

FACES_DIR = 'faces'
os.makedirs(FACES_DIR, exist_ok=True)

REGISTRATION_CHALLENGES = [
    {'id': 'look_straight', 'instruction': 'Look straight at the camera'},
    {'id': 'turn_left', 'instruction': 'Please turn your head to the left'},
    {'id': 'turn_right', 'instruction': 'Please turn your head to the right'},
]

VERIFICATION_CHALLENGES = [
    {'id': 'smile', 'instruction': 'Please smile at the camera'},
    {'id': 'open_mouth', 'instruction': 'Please open your mouth'},
    {'id': 'raise_eyebrows', 'instruction': 'Please raise your eyebrows'},
]

def base64_to_image(base64_string):
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    img_bytes = base64.b64decode(base64_string)
    img = Image.open(io.BytesIO(img_bytes))
    return img

def save_image(img, path):
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img.save(path)

def check_liveness(img_array):
    try:
        from deepface import DeepFace
        faces = DeepFace.extract_faces(
            img_path=img_array,
            detector_backend='opencv',
            enforce_detection=False,
            anti_spoofing=True
        )
        if len(faces) == 0:
            return False, 'No face detected. Please position your face clearly.'
        if len(faces) > 1:
            return False, 'Multiple faces detected. Please ensure only your face is visible.'
        face = faces[0]
        if not face.get('is_real', True):
            return False, 'Liveness check failed. Please use a real face, not a photo or screen.'
        return True, 'OK'
    except Exception as e:
        print(f'Liveness error: {e}')
        return False, str(e)

def detect_challenge(img_array, challenge_id):
    try:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(80, 80))

        if len(faces) == 0:
            return False

        (x, y, w, h) = faces[0]
        face_center_x = x + w // 2
        img_width = img_array.shape[1]
        img_center_x = img_width // 2

        if challenge_id == 'look_straight':
            offset = abs(face_center_x - img_center_x) / img_width
            return offset < 0.15

        elif challenge_id == 'turn_left':
            return face_center_x < img_center_x - img_width * 0.05

        elif challenge_id == 'turn_right':
            return face_center_x > img_center_x + img_width * 0.05

        elif challenge_id == 'smile':
            smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
            roi_gray = gray[y:y+h, x:x+w]
            smiles = smile_cascade.detectMultiScale(roi_gray, 1.8, 20)
            return len(smiles) > 0

        elif challenge_id == 'open_mouth':
            smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
            roi_gray = gray[y:y+h, x:x+w]
            smiles = smile_cascade.detectMultiScale(roi_gray, 1.5, 10)
            return len(smiles) > 0

        elif challenge_id == 'raise_eyebrows':
            eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            roi_gray = gray[y:y+h//2, x:x+w]
            eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 5)
            return len(eyes) >= 2

        return False
    except Exception as e:
        print(f'Challenge detection error: {e}')
        return False

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Face service running.'})

@app.route('/challenge', methods=['GET'])
def get_challenge():
    challenge_type = request.args.get('type', 'verification')
    if challenge_type == 'registration':
        step = int(request.args.get('step', 0))
        challenge = REGISTRATION_CHALLENGES[step % len(REGISTRATION_CHALLENGES)]
    else:
        challenge = random.choice(VERIFICATION_CHALLENGES)
    return jsonify({'success': True, 'challenge': challenge})

@app.route('/register', methods=['POST'])
def register_face():
    try:
        data = request.get_json()
        student_uuid = data.get('student_uuid')
        image_base64 = data.get('image')
        challenge_id = data.get('challenge_id')
        step = int(data.get('step', 0))

        if not student_uuid or not image_base64 or not challenge_id:
            return jsonify({'success': False, 'message': 'Student UUID, image and challenge are required.'}), 400

        img = base64_to_image(image_base64)
        img_array = np.array(img)

        is_live, liveness_message = check_liveness(img_array)
        if not is_live:
            return jsonify({'success': False, 'message': liveness_message, 'liveness_failed': True}), 400

        challenge_passed = detect_challenge(img_array, challenge_id)
        if not challenge_passed:
            return jsonify({
                'success': False,
                'message': 'Challenge not detected. Please try again.',
                'challenge_failed': True
            }), 400

        face_path = os.path.join(FACES_DIR, f'{student_uuid}_{step}.jpg')
        save_image(img, face_path)

        total_steps = len(REGISTRATION_CHALLENGES)
        is_complete = step >= total_steps - 1
        next_step = step + 1 if not is_complete else None

        print(f'Step {step} completed. is_complete={is_complete}, next_step={next_step}')

        return jsonify({
            'success': True,
            'message': f'Step {step + 1} completed.' if not is_complete else 'Face registered successfully.',
            'is_complete': is_complete,
            'next_step': next_step
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/verify', methods=['POST'])
def verify_face():
    try:
        data = request.get_json()
        student_uuid = data.get('student_uuid')
        image_base64 = data.get('image')
        challenge_id = data.get('challenge_id')

        if not student_uuid or not image_base64 or not challenge_id:
            return jsonify({'success': False, 'message': 'Student UUID, image and challenge are required.'}), 400

        registered_faces = [
            os.path.join(FACES_DIR, f'{student_uuid}_{i}.jpg')
            for i in range(len(REGISTRATION_CHALLENGES))
        ]
        existing_faces = [f for f in registered_faces if os.path.exists(f)]

        if len(existing_faces) == 0:
            old_path = os.path.join(FACES_DIR, f'{student_uuid}.jpg')
            if os.path.exists(old_path):
                existing_faces = [old_path]
            else:
                return jsonify({'success': False, 'message': 'Face not registered. Please register first.'}), 404

        img = base64_to_image(image_base64)
        img_array = np.array(img)

        is_live, liveness_message = check_liveness(img_array)
        if not is_live:
            return jsonify({'success': False, 'message': liveness_message, 'liveness_failed': True}), 400

        challenge_passed = detect_challenge(img_array, challenge_id)
        if not challenge_passed:
            return jsonify({
                'success': False,
                'message': 'Challenge not detected. Please try again.',
                'challenge_failed': True
            }), 400

        from deepface import DeepFace
        verified = False
        min_distance = float('inf')

        for face_path in existing_faces:
            try:
                result = DeepFace.verify(
                    img1_path=img_array,
                    img2_path=face_path,
                    model_name='Facenet512',
                    detector_backend='opencv',
                    enforce_detection=False
                )
                if result['distance'] < min_distance:
                    min_distance = result['distance']
                if result['verified']:
                    verified = True
                    break
            except Exception as e:
                print(f'Verify error for {face_path}: {e}')
                continue

        if verified:
            return jsonify({'success': True, 'verified': True, 'message': 'Face verified successfully.', 'distance': min_distance})
        else:
            return jsonify({'success': False, 'verified': False, 'message': 'Face does not match.', 'distance': min_distance})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/delete', methods=['POST'])
def delete_face():
    try:
        data = request.get_json()
        student_uuid = data.get('student_uuid')

        if not student_uuid:
            return jsonify({'success': False, 'message': 'Student UUID is required.'}), 400

        for i in range(len(REGISTRATION_CHALLENGES)):
            face_path = os.path.join(FACES_DIR, f'{student_uuid}_{i}.jpg')
            if os.path.exists(face_path):
                os.remove(face_path)

        old_path = os.path.join(FACES_DIR, f'{student_uuid}.jpg')
        if os.path.exists(old_path):
            os.remove(old_path)

        return jsonify({'success': True, 'message': 'Face deleted successfully.'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/check-challenge', methods=['POST'])
def check_challenge():
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        challenge_id = data.get('challenge_id')

        if not image_base64 or not challenge_id:
            return jsonify({'success': False, 'detected': False}), 400

        img = base64_to_image(image_base64)
        img_array = np.array(img)

        detected = detect_challenge(img_array, challenge_id)
        return jsonify({'success': True, 'detected': bool(detected)})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'detected': False, 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)