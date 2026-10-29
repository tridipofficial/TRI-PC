/**
 * Audio Processor Worklet for TRI AI Voice Pipeline
 * Inspired by Archer AI Audio Engine Architecture
 * Captures microphone audio and converts Float32 to 16-bit Int16 PCM in real-time.
 * Runs on a dedicated Web Audio thread without blocking the UI.
 */

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input && input.length > 0) {
      const inputData = input[0]; // First channel (mono)

      if (inputData && inputData.length > 0) {
        // Convert Float32 [-1.0, 1.0] to Int16 PCM [-32768, 32767]
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send PCM data to main thread with buffer ownership transfer
        this.port.postMessage({
          type: 'audio-data',
          data: pcm16.buffer
        }, [pcm16.buffer]);
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
