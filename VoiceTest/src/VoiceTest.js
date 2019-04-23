// @flow
import React, { Component } from 'react';

import { Clipboard, StyleSheet, Text, TextInput, View, Image, TouchableHighlight, FlatList, List, Button } from 'react-native';
import uuidv1 from 'uuid/v1';

import {
  AudioRecorder,
  AudioUtils
} from 'react-native-audio';

import Sound from 'react-native-sound';

import Voice from 'react-native-voice';
import moment from 'moment';

import AsyncStorage from '@react-native-community/async-storage';

const memoInitialState = [

]

class VoiceTest extends Component {
  state = {
    recognized: '',
    pitch: '',
    error: '',
    end: '',
    started: '',
    results: [],
    partialResults: [],
    isRecording: false,
    isReviewing: false,
    isCreatingNewMemo: false,
    memos: [],
    audioPath: AudioUtils.DocumentDirectoryPath,
    fileUUID: '',
    searchText: ''
  };

  constructor(props) {
    super(props);
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechRecognized = this.onSpeechRecognized;
    Voice.onSpeechEnd = this.onSpeechEnd;
    Voice.onSpeechError = this.onSpeechError;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechPartialResults = this.onSpeechPartialResults;
    Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged;

    AudioRecorder.requestAuthorization().then((isAuthorised) => {
      this.setState({ hasPermission: isAuthorised });

      if (!isAuthorised) return;

      AudioRecorder.onFinished = (data) => {
        // Android callback comes in the form of a promise instead.
        this._finishRecording(data.status === "OK", data.audioFileURL, data.audioFileSize);
      };
    });
  }

  componentDidMount() {
    this.updateMemosFromDatabase();
  }

  async updateMemosFromDatabase() {
    const userNotes = await AsyncStorage.getItem("userNotes");
    this.setState({
      memos: JSON.parse(userNotes || "[]"),
    });
  }

  addToMemos(memo) {
    const memos = JSON.stringify(this.state.memos.concat([memo]));
    AsyncStorage.setItem("userNotes", memos);
    this.updateMemosFromDatabase();
  }

  deleteMemoFromDatabase(memo) {
    const memos = JSON.stringify(this.state.memos.filter(m => m.key !== memo.key));
    AsyncStorage.setItem("userNotes", memos, () => this.updateMemosFromDatabase());
    this.setState({
      note: null
    });
  }

  prepareRecordingPath(audioPath){
    AudioRecorder.prepareRecordingAtPath(audioPath, {
      SampleRate: 22050,
      Channels: 1,
      AudioQuality: "Low",
      AudioEncoding: "aac",
      AudioEncodingBitRate: 32000
    });
  }

  componentWillUnmount() {
    Voice.destroy().then(Voice.removeAllListeners);
  }

  onSpeechStart = e => {
    // eslint-disable-next-line
    this.setState({
      started: '√',
    });
  };

  onSpeechRecognized = e => {
    // eslint-disable-next-line
    this.setState({
      recognized: '√',
    });
  };

  onSpeechEnd = e => {
    // eslint-disable-next-line
    console.log('onSpeechEnd: ', e);
    this.setState({
      end: '√',
    });
  };

  onSpeechError = e => {
    // eslint-disable-next-line
    console.log('onSpeechError: ', e);
    this.setState({
      error: JSON.stringify(e.error),
    });
  };

  onSpeechResults = e => {
    // eslint-disable-next-line
    console.log('onSpeechResults: ', e);
    this.setState({
      results: e.value,
    });
  };

  onSpeechPartialResults = e => {
    // eslint-disable-next-line
    console.log('onSpeechPartialResults: ', e);
    this.setState({
      partialResults: e.value,
    });
  };

  onSpeechVolumeChanged = e => {
    // eslint-disable-next-line
    console.log('onSpeechVolumeChanged: ', e);
    this.setState({
      pitch: e.value,
    });
  };

  _onDestroyNewMemo () {
    this.setState({
      isReviewing: false,
      isCreatingNewMemo: false,
      recognized: '',
      pitch: '',
      error: '',
      started: '',
      results: [],
      partialResults: [],
      end: '',
    });
  }

  _onSaveNewMemo () {
    const resultText = this.state.results.join(' ');

    this.addToMemos({
      key: uuidv1(),
      text: resultText,
      timestamp: new Date(),
      audioFile: this.state.audioPath + '/' + this.state.fileUUID + '.aac'
    });

    this.setState({
      isReviewing: false,
      isCreatingNewMemo: false,
      // memos: this.state.memos.concat([{
      //   key: uuidv1(),
      //   text: resultText,
      //   timestamp: new Date(),
      //   audioFile: this.state.audioPath + '/' + this.state.fileUUID + '.aac'
      // }]),
    });
  }

  _onRecordNewMemo () {
    if (!this.state.isRecording) {
      const fileUUID = uuidv1();

      this.prepareRecordingPath(this.state.audioPath + '/' + fileUUID + '.aac');
      this._record();
      this._startRecognizing();
      this.setState({
        fileUUID,
        isCreatingNewMemo: true,
        isRecording: true
      });
    } else {
      this._stopRecognizing();
      this.setState({
        isRecording: false,
        isReviewing: true
      });

      AudioRecorder.stopRecording();
    }

    this.setState({
      isRecording: !this.state.isRecording
    });
  }

  async _record() {
    if (!this.state.hasPermission) {
      console.warn('Can\'t record, no permission granted!');
      return;
    }

    try {
      const filePath = await AudioRecorder.startRecording();
    } catch (error) {
      console.error(error);
    }
  }

  _finishRecording(didSucceed, filePath, fileSize) {
    console.log(`Finished recording of duration ${this.state.currentTime} seconds at path: ${filePath} and size of ${fileSize || 0} bytes`);
  }


  _startRecognizing = async () => {
    this.setState({
      recognized: '',
      pitch: '',
      error: '',
      started: '',
      results: [],
      partialResults: [],
      end: '',
    });

    try {
      await Voice.start('en-US');
    } catch (e) {
      //eslint-disable-next-line
      console.error(e);
    }
  };

  _stopRecognizing = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      //eslint-disable-next-line
      console.error(e);
    }
  };

  _cancelRecognizing = async () => {
    try {
      await Voice.cancel();
    } catch (e) {
      //eslint-disable-next-line
      console.error(e);
    }
  };

  _destroyRecognizer = async () => {
    try {
      await Voice.destroy();
    } catch (e) {
      //eslint-disable-next-line
      console.error(e);
    }
    this.setState({
      recognized: '',
      pitch: '',
      error: '',
      started: '',
      results: [],
      partialResults: [],
      end: '',
    });
  };

  recorderView() {
    return <View style={{ flex: 1, padding: 20, fontSize: 20 }}>
      <Text style={{ fontWeight: '500', fontSize: 20, marginBottom: 30 }}>New memo</Text>
      {!this.state.isRecording && this.state.results.map((result, index) => {
        return (
          <Text key={`result-${index}`} style={{ color: 'black', fontSize: 30, fontWeight: '300' }}>
            {result}
          </Text>
        );
      })}

      {this.state.isRecording && this.state.partialResults.map((result, index) => {
        return (
          <Text key={`partial-result-${index}`} style={{ color: 'grey', fontSize: 30, fontWeight: '300' }}>
            {result}
          </Text>
        );
      })}
    </View>
  }

  noteView(note) {
    return <View style={{ flex: 1, padding: 20, fontSize: 20 }}>
      <Text style={{ fontWeight: '500', fontSize: 20, marginBottom: 30 }}>{new moment(note.timestamp).fromNow()}</Text>
      <Text style={{ color: 'black', fontSize: 30, fontWeight: '300' }}>
        {note.text}
      </Text>
    </View>
  }

  noteListView() {
    let { memos } = this.state;

    if (this.state.searchText && this.state.searchText.length > 0) {
      memos = memos.filter(m => {
        const pattern = this.state.searchText;
        const re = new RegExp(pattern, 'i');
        return re.test(m.text);
      });
    }

    return <FlatList
      data={memos}
      renderItem={({item}) => <TouchableHighlight underlayColor="white" onPress={() => this.setState({ note: item })}><View key={item.key} style={{ borderRadius: 4, borderWidth: 0.5, borderColor: '#EEE', margin: 5, padding: 10 }}>
        <Text style={{ fontWeight: '500', marginBottom: 5, fontSize: 16 }}>{new moment(item.timestamp).fromNow()}</Text>
        <Text numberOfLines={3} style={{ lineHeight: 20, fontWeight: '300' }}>{item.text}</Text>
      </View></TouchableHighlight>}
    />;
  }

  async _play() {
    if (this.state.recording) {
      await this._stop();
    }

    // These timeouts are a hacky workaround for some issues with react-native-sound.
    // See https://github.com/zmxv/react-native-sound/issues/89.
    setTimeout(() => {
      var sound = new Sound(this.state.audioPath + '/' + this.state.fileUUID + '.aac', '', (error) => {
        if (error) {
          console.log('failed to load the sound', error);
        }
      });

      setTimeout(() => {
        sound.play((success) => {
          if (success) {
            console.log('successfully finished playing');
          } else {
            console.log('playback failed due to audio decoding errors');
          }
        });
      }, 100);
    }, 100);
  }

  async _playNote(note) {
    setTimeout(() => {
      var sound = new Sound(note.audioFile, '', (error) => {
        if (error) {
          console.log('failed to load the sound', error);
        }
      });

      setTimeout(() => {
        sound.play((success) => {
          if (success) {
            console.log('successfully finished playing');
          } else {
            console.log('playback failed due to audio decoding errors');
          }
        });
      }, 100);
    }, 100);
  }

  _onBackToList() {
    this.setState({
      note: null
    });
  }

  _onDeleteMemo(note) {
    this.deleteMemoFromDatabase(note);
  }

  renderHeader() {
    return <TextInput
      style={{ fontSize: 16, padding: 10 }}
      placeholder="🔎 Search your memos"
      onChangeText={text => this.setState({ searchText: text })}
      value={this.state.searchText}
    />;
  }

  render() {
    return <View style={{ flex: 1, marginTop: 50, marginBottom: 20, justifyContent: 'center', alignContent: 'center' }}>
      {this.state.memos.length > 0 && !this.state.note && !this.state.isCreatingNewMemo && this.renderHeader()}
      {this.state.memos.length > 0 && !this.state.note && !this.state.isCreatingNewMemo && this.noteListView()}
      {!this.state.note && this.state.isCreatingNewMemo && this.recorderView()}
      {this.state.note && this.noteView(this.state.note)}
      {!this.state.note && !this.state.isReviewing && <Button
        onPress={() => this._onRecordNewMemo()}
        title={this.state.isRecording ? '✋' : '🎤'}
        color={this.state.isRecording ? 'grey' : 'red' }
      />}
      {!this.state.note && this.state.isCreatingNewMemo && this.state.isReviewing && <View>
        <Button
          onPress={() => this._onSaveNewMemo()}
          title={'💾'}
          color={'green'}
        />
        <Button
          onPress={() => this._onDestroyNewMemo()}
          title={'🗑️'}
          color={'red'}
        />
        <Button
          onPress={() => this._play()}
          title={'🎶'}
          color={'blue'}
        />
        {<Button
          onPress={() => Clipboard.setString(this.state.note.text)}
          title={'🔗'}
          color={'blue'}
        />}
      </View>}

      {this.state.note && <View>
        {this.state.note.audioFile && <Button
          onPress={() => this._playNote(this.state.note)}
          title={'🎶'}
          color={'blue'}
        />}

        {<Button
          onPress={() => Clipboard.setString(this.state.note.text)}
          title={'🔗'}
          color={'blue'}
        />}
        <Button
          onPress={() => this._onDeleteMemo(this.state.note)}
          title={'🗑️'}
          color={'red'}
        />
        <Button
          onPress={() => this._onBackToList()}
          title={'🔙'}
          color={'grey'}
        />
      </View>}
    </View>;
  }
}

const styles = StyleSheet.create({
  button: {
    width: 50,
    height: 50,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  action: {
    textAlign: 'center',
    color: '#0000FF',
    marginVertical: 5,
    fontWeight: 'bold',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  stat: {
    textAlign: 'center',
    color: '#B0171F',
    marginBottom: 1,
  },
});

export default VoiceTest;
