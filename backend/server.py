from flask import Flask, request, jsonify
from PIL import Image
import io
import android_qr
import base64
import json

app = Flask(__name__)

@app.route('/process_qr_code', methods=['POST'])
def process_qr_code():
    # Receive image file from the POST request
    payload = request.json
    
    # Read the image file
    # image_data = image_file.read()
    print('payload', payload['image'])
    
    # Convert image data to PIL Image
    image = Image.open(io.BytesIO(base64.b64decode(payload['image'])))
    image.save("test.jpg")
    
    # Process the image for QR code decoding
    decoded_data = _decode_qr_code(image)

    try:
        json.loads(decoded_data)
    except ValueError as e:
        return jsonify({'decoded_data': decoded_data})

    return jsonify({'decoded_data': json.loads(decoded_data)})

def _decode_qr_code(image):
    try:
        decoded_data = android_qr.decode_qr_code(image, False)
        return decoded_data
    except Exception as e:
        print("Error decoding QR code:", e)
        return None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)