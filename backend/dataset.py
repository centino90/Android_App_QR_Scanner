import json 
from string import Template
from pathlib import Path
import android_qr
import os
import shutil

if os.path.isfile("dataset.json"):
  # Open the file in read mode
  with open('dataset.json', 'r') as file:
    if os.path.isdir("output-low"):
      shutil.rmtree("output-low")

    if os.path.isdir("output-high"):
      shutil.rmtree("output-high")

    directory = Path('output-low')
    directory.mkdir(parents=True, exist_ok=True)

    highDirectory = Path('output-high')
    highDirectory.mkdir(parents=True, exist_ok=True)

    # Read the entire contents of the file into a string
    content = json.load(file)

    # template for the filename(s)
    templateFileName = Template('${datasetIndex}-${name}')

    # start process dataset for low accuracy qr generation 
    lowDatasetIndex = 0
    for lowItem in content:
        fileName = templateFileName.substitute(datasetIndex=lowDatasetIndex+1, name=lowItem['label'])        
        fileName = fileName.replace(" ", "_")

        itemDirectory = Path('output-low/' + fileName)
        itemDirectory.mkdir(parents=True, exist_ok=True)

        imagePath   = 'output-low/' + fileName + '/' + fileName + '.png'
        jsonPath    = 'output-low/' + fileName + '/' + fileName + '.json'

        with open(jsonPath, "w") as json_file:            
            json.dump(lowItem, json_file, indent=3)

        qr_code = android_qr.generate_low_qr(json.dumps(lowItem))
        qr_code.save(imagePath)
        lowDatasetIndex+=1

    # start process dataset for high accuracy qr generation 
    highDatasetIndex = 0
    for highItem in content:
        fileName = templateFileName.substitute(datasetIndex=highDatasetIndex+1, name=highItem['label'])        
        fileName = fileName.replace(" ", "_")

        itemDirectory = Path('output-high/' + fileName)
        itemDirectory.mkdir(parents=True, exist_ok=True)

        imagePath   = 'output-high/' + fileName + '/' + fileName + '.png'
        jsonPath    = 'output-high/' + fileName + '/' + fileName + '.json'

        with open(jsonPath, "w") as json_file:            
            json.dump(highItem, json_file, indent=3)

        qr_code = android_qr.generate_high_qr(json.dumps(highItem))
        qr_code.save(imagePath)
        highDatasetIndex+=1
  print("done dataset processing")
else:
  print("dataset.json file does not exist")      
