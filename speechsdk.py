import azure.cognitiveservices.speech as speechsdk
import time
import os, sys
from dotenv import load_dotenv

load_dotenv()

speech_key = os.getenv("SPEECH_KEY") 
speech_region = os.getenv("SPEECH_REGION") 

print(speech_key, speech_region)

# Creates an instance of a speech config with specified subscription key and service region.
# Replace with your own subscription key and service region (e.g., "westus").
speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)
audio_config = speechsdk.AudioConfig(use_default_microphone=True)

# Creates a recognizer with the given settings
speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

# Either delete this, or make "Exit" detection trigger to true to exit while loop below.
done = False

def stop_cb(evt):
    """callback that stops continuous recognition upon receiving an event 'evt'"""
    global done
    done = True
    print('CLOSING on {}'.format(evt))

#Event listeners - examples of named functions instead of lambdas used below.
# def session_started(evt):
#     print('SESSION STARTED: {}'.format(evt.session_id))

# def recognized(evt):
#     print('RECOGNIZED: {}'.format(evt.result.text))

def on_recognized(evt):
    print('RECOGNIZED: {}'.format(evt.result.text))
    if "exit" in evt.result.text.lower():
        speech_recognizer.stop_continuous_recognition()

#Connect callbacks to the events fired by the speech recognizer
speech_recognizer.session_started.connect(lambda evt: print('SESSION STARTED'))
speech_recognizer.session_stopped.connect(lambda evt: print('SESSION STOPPED'))
speech_recognizer.recognizing.connect(lambda evt: print('RECOGNIZING: {}'.format(evt.result.text)))
speech_recognizer.recognized.connect(on_recognized)

# Stop continuous recognition on either session stopped or canceled events
speech_recognizer.session_stopped.connect(stop_cb)

# Starts speech recognition, and returns after a single utterance is recognized. The end of a
# single utterance is determined by listening for silence at the end or until a maximum of 15
# seconds of audio is processed.  The task returns the recognition text as result. 
# Note: Since recognize_once() returns only a single utterance, it is suitable only for single
# shot recognition like command or query. 
# For long-running multi-utterance recognition, use start_continuous_recognition() instead.
print("Say something...")

result = speech_recognizer.start_continuous_recognition()

while not done:
    time.sleep(.5)