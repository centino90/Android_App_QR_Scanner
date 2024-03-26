import qrcode
import numpy as np
import cv2
from pyzbar.pyzbar import decode
import json 
from reedsolo import RSCodec, ReedSolomonError

def generate_qr_code(data):
  # create as QR code instance
  qr = qrcode.QRCode(
    version=11,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=20,
    border=4
  )

  # add data to the QR code
  qr.add_data(data)
  qr.make(fit=True)

  # create an image from the QR code
  img = qr.make_image(fill_color="black", back_color="white")
  
  return img

def add_reed_solomon_error_correction3(data, version=11):
    try:
         # Convert data to bytes
        data_bytes = data.encode('utf-8')

        # Calculate the number of error correction codewords needed based on the QR version
        num_data_codewords = qrcode.util.mode_sizes[4][version]  # Mode 4 corresponds to byte mode
        num_ec_codewords = qrcode.util.rs_blocks(version, 1)[0].ecc_count

        # Create a numpy array to store the data and error correction codewords
        data_and_ec = np.zeros(num_data_codewords + num_ec_codewords, dtype=np.uint8)

        # Copy the data into the array
        data_and_ec[:len(data_bytes)] = np.frombuffer(data_bytes, dtype=np.uint8)

        # Apply Reed-Solomon encoding
        qrcode.util.rs_encode_msg(data_and_ec, num_ec_codewords)

        # Convert the result back to a string
        result_data = data_and_ec.tobytes().decode('utf-8')

        return result_data
    except Exception as e:
        print("Error adding Reed-Solomon error correction:", e)
        return None

def add_reed_solomon_error_correction2(data):
  # convert data to bytes
  data_bytes = data.encode('utf-8')

  # calculate the number of error correction codewords needed based on the QR version
  num_ec_codewords = qrcode.base.rs_blocks(len(data_bytes), 1)[0]
  print("num_ec_codewords", num_ec_codewords)
  # create a numpy array to store the data and error correction codewords
  data_and_ec = np.zeros(len(data_bytes) + num_ec_codewords.total_count, dtype=np.uint8)

  # copy the data into the array
  data_and_ec[:len(data_bytes)] = np.frombuffer(data_bytes, dtype=np.uint8)

  # apply reed-solomon encoding
  qrcode.base.reed_solomon_encode(data_and_ec, num_ec_codewords)
  
  # convert the result back to a string
  result_data = data_and_ec.tobytes().decode('utf-8')

  return result_data

def add_reed_solomon_error_correction(data, ec_codewords=10):
    try:
        # Initialize Reed-Solomon codec
        rs = RSCodec(ec_codewords)

        # Encode data with Reed-Solomon error correction
        encoded_data = rs.encode(data.encode('utf-8'))
        print(encoded_data)
        
        # Decode the encoded data to ensure correctness
        decoded_data = rs.decode(encoded_data)[0]

        print(decoded_data)

        # Convert the result back to a string
        result_data = decoded_data.decode('utf-8')

        return result_data
    except Exception as e:
        print("Error adding Reed-Solomon error correction:", e)
        return None

def encode_reed_solomon_error_correction(data, ec_codewords=12):
    try:
        # Initialize Reed-Solomon codec
        rs = RSCodec(ec_codewords)

        # Encode data with Reed-Solomon error correction
        encoded_data = rs.encode(data.encode('utf-8'))

        # decoded_data = rs.decode(encoded_data)[0]

        # # Convert the result back to a string
        # result_data = decoded_data.decode('utf-8')
        # print('=====')
        print(encoded_data)

        return encoded_data
    except Exception as e:
        print("Error adding Reed-Solomon error correction:", e)
        return None

def decoded_reed_solomon_error_correction(data, ec_codewords=2):
    try:
        # Initialize Reed-Solomon codec
        rs = RSCodec(ec_codewords)
        # Decode the encoded data to ensure correctness
        decoded_data = rs.decode(data)[0]

        # Convert the result back to a string
        # result_data = decoded_data.decode('utf-8')   

        decoded_data2 = rs.decode(decoded_data)[0]
        print(decoded_data2)  

        return result_data
    except Exception as e:
        print("Error adding Reed-Solomon error correction:", e)
        return None

def decode_qr_code(image_path):
    # Read the QR code image
    qr_image = cv2.imread(image_path)

    # Convert the image to grayscale
    gray_image = cv2.cvtColor(qr_image, cv2.COLOR_BGR2GRAY)

    # Decode the QR code using pyzbar
    decoded_objects = decode(gray_image)

    decoded = ''
    # Print decoded data
    for obj in decoded_objects:
        # print("Image:", gray_image)
        # print(obj)
        # print("Type:", obj.type)
        # print("Data:", obj.data.decode('utf-8'))
        decoded = obj.data

    return decoded

# test

original_data = {
  'type': 'antique',
  'category': 'vase',
  'label': 'Old vase #1',
  'description': 'a vase created in 1500',
  'creator': 'John Doe',
  'year_created': '1500'
}

# add reed-solomon error correction to the data
data_with_reed_solomon = encode_reed_solomon_error_correction(json.dumps(original_data))
# print(data_with_reed_solomon)

# output = json.dumps(original_data)

# generate qr code
qr_code = generate_qr_code(data_with_reed_solomon)
qr_code.save("reed-solomon.png")

dec = decode_qr_code("reed-solomon.png")
decc = decoded_reed_solomon_error_correction(dec)
print(decc)
# qr_code.show()