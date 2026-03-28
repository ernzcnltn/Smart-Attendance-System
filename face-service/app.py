from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import os
import numpy as np
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

FACES_DIR = 'faces'
os.makedirs(FACES_DIR, exist_ok=True)

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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Face service running.'})

@app.route('/register', methods=['POST'])
def register_face():
    try:
        data = request.get_json()
        student_uuid = data.get('student_uuid')
        image_base64 = data.get('image')

        if not student_uuid or not image_base64:
            return jsonify({'success': False, 'message': 'Student UUID and image are required.'}), 400

        img = base64_to_image(image_base64)
        
        from deepface import DeepFace
        
        img_array = np.array(img)
        
        try:
            faces = DeepFace.extract_faces(img_path=img_array, detector_backend='opencv', enforce_detection=True)
            if len(faces) == 0:
                return jsonify({'success': False, 'message': 'No face detected. Please try again.'}), 400
            if len(faces) > 1:
                return jsonify({'success': False, 'message': 'Multiple faces detected. Please ensure only your face is visible.'}), 400
        except Exception:
            return jsonify({'success': False, 'message': 'No face detected. Please try again.'}), 400

        face_path = os.path.join(FACES_DIR, f'{student_uuid}.jpg')
        save_image(img, face_path)

        return jsonify({'success': True, 'message': 'Face registered successfully.'})

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

        if not student_uuid or not image_base64:
            return jsonify({'success': False, 'message': 'Student UUID and image are required.'}), 400

        face_path = os.path.join(FACES_DIR, f'{student_uuid}.jpg')
        if not os.path.exists(face_path):
            return jsonify({'success': False, 'message': 'Face not registered. Please register first.'}), 404

        img = base64_to_image(image_base64)
        img_array = np.array(img)

        from deepface import DeepFace

        result = DeepFace.verify(
            img1_path=img_array,
            img2_path=face_path,
            model_name='Facenet512',
            detector_backend='opencv',
            enforce_detection=True
        )

        if result['verified']:
            return jsonify({'success': True, 'verified': True, 'message': 'Face verified successfully.', 'distance': result['distance']})
        else:
            return jsonify({'success': False, 'verified': False, 'message': 'Face does not match.', 'distance': result['distance']})

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

        face_path = os.path.join(FACES_DIR, f'{student_uuid}.jpg')
        if os.path.exists(face_path):
            os.remove(face_path)

        return jsonify({'success': True, 'message': 'Face deleted successfully.'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)