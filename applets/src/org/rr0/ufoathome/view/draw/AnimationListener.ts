export interface AnimationListener {
  timeChanged(timeEvent: AnimationEvent);

  animationStarted();

  animationStopped();

  modeChanged(mode: String);
}
