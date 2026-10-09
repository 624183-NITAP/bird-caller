import { pipeline, env } from '@xenova/transformers';

// Skip local model check since we are fetching from Hugging Face initially.
// After the first run, the browser will cache the model in the Cache API.
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineSingleton {
  static task = 'audio-classification';
  static model = 'Xenova/ast-finetuned-audioset-10-10-0.4593';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  // We expect an AudioBuffer's Float32Array channel data
  const { audio } = event.data;

  try {
    const classifier = await PipelineSingleton.getInstance(x => {
      // Send progress back to the main thread
      self.postMessage(x);
    });
    
    self.postMessage({ status: 'inferencing' });
    const output = await classifier(audio);
    
    // Filter to nature-related classes (birds, weather, water, insects, etc.)
    const natureKeywords = [
      'bird', 'chirp', 'tweet', 'songbird', 'owl', 'crow', 'pigeon', 'eagle', 'hawk', 'duck', 'goose', 'swan', 'parrot', 'canary', 'woodpecker',
      'rain', 'wind', 'breeze', 'storm', 'thunder', 'water', 'stream', 'river', 'ocean', 'wave', 'rustle', 'leaves',
      'insect', 'cricket', 'frog', 'toad', 'cicada', 'nature', 'weather'
    ];
    
    const filteredOutput = output.filter(pred => {
      const label = pred.label.toLowerCase();
      return natureKeywords.some(keyword => label.includes(keyword));
    });

    self.postMessage({
      status: 'complete',
      output: filteredOutput.length > 0 ? filteredOutput : output // Fallback to all if no bird detected so they see something
    });
  } catch (error) {
    self.postMessage({ status: 'error', error: error.message });
  }
});
