from flask import Flask, request, jsonify
from PIL import Image
import io
import android_qr

app = Flask(__name__)

@app.route('/process_qr_code', methods=['POST'])
def process_qr_code():
    # Receive image file from the POST request
    image_file = request.files['image']
    
    # Read the image file
    image_data = image_file.read()
    
    # Convert image data to PIL Image
    image = Image.open(io.BytesIO(image_data))
    
    # Process the image for QR code decoding
    decoded_data = _decode_qr_code(image)
    
    return jsonify({'decoded_data': decoded_data})

def _decode_qr_code(image):
    try:
        decoded_data = android_qr.decode_qr_code(image, False)
        return decoded_data
    except Exception as e:
        print("Error decoding QR code:", e)
        return None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)