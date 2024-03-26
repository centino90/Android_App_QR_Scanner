import qrcode
import cv2
from pyzbar.pyzbar import decode

def generate_low_qr(data):
  # create as QR code instance
  qr = qrcode.QRCode(
    version=11,
    error_correction=0,
    box_size=5,
    border=4
  )

  # add data to the QR code
  qr.add_data(data)
  qr.make(fit=True)

  # create an image from the QR code
  img = qr.make_image(fill_color="black", back_color="white")
  
  return img

def generate_high_qr(data):
  # create as QR code instance
  qr = qrcode.QRCode(
    version=11,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=5,
    border=4
  )

  # add data to the QR code
  qr.add_data(data)
  qr.make(fit=True)

  # create an image from the QR code
  img = qr.make_image(fill_color="black", back_color="white")
  
  return img

def decode_qr_code(image_path, isPath=True):    
    if(isPath):
      # Read the QR code image
      qr_image = cv2.imread(image_path)

      # Convert the image to grayscale
      gray_image = cv2.cvtColor(qr_image, cv2.COLOR_BGR2GRAY)
    else:
      gray_image = image_path 

    # Decode the QR code using pyzbar
    decoded_objects = decode(gray_image)
 
    decoded = ''
    for obj in decoded_objects:
        # print("Type:", obj.type)
        # print("Data:", obj.data.decode('utf-8'))
        decoded = obj.data.decode('utf-8')

    return decoded
