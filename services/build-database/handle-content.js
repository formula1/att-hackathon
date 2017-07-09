


function handleContent(){

}

function consumeContentPeice(contentPeice){
  var classificationName = contentPeice.CONTENT_TITLE;
  if(!classificationName) return Promise.resolve();
  return Promise.all(
    trainVisualRecognition(contentPeice),
    trainAudioRecognition(contentPeice),
  );
}


function trainVisualRecognition(contentPeice){
  return saturateTitle(contentPeice).then(function(){

  });

}


function trainAudioRecognition(contentPeice){


}
