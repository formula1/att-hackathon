

function passVideoThroughRecognition(videoFile){
  return Promise.all([
    handleVideoCategorization(videoFile),
    handleAudioCategorization(videoFile),
  ]);
}

function handleVideoCategorization(videoFile){
  return extractImages(videoFile).then(function(images){
    return tagImages(images);
  });
}

function handleAudioCategorization(videoFile){
  return extractAudio(videoFile).then(function(audioFile){
    return speechToText(audioFile);
  }).then(function(text){
    return tagText(text);
  });
}
