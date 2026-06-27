export function playAlert(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    osc.frequency.value = 880
    osc.connect(ctx.destination)
    osc.start()
    setTimeout(() => osc.stop(), 800)
  } catch {
    // Web Audio not available in test environment — silent fail
  }
}
