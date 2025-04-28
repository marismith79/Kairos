let callEndedAlreadyHandled = false;

export function hasCallEndedBeenHandled(): boolean {
  return callEndedAlreadyHandled;
}

export function markCallEndedHandled(): void {
  callEndedAlreadyHandled = true;
}

export function resetCallEndedHandled(): void {
  callEndedAlreadyHandled = false;
}
