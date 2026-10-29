
const PREVENT_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Space",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyP"
]);

export class Input {
  constructor() {
    this.keys = new Set();
    this.jumpRequested = false;
    this.active = false;
    this.onPause = null;

    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    this.onBlur = () => this.clear();
    this.onVisibility = () => {
      if (document.hidden) this.clear();
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.bindTouchControls();
  }

  handleKeyDown(event) {
    if (PREVENT_KEYS.has(event.code) && this.active) {
      event.preventDefault();
    }

    if (event.code === "KeyP" && !event.repeat && this.active) {
      this.onPause?.();
      return;
    }

    if (!this.active) return;

    if (
      ["Space", "ArrowUp", "KeyW"].includes(event.code) &&
      !event.repeat
    ) {
      this.jumpRequested = true;
    }

    if (!event.repeat) {
      this.keys.add(event.code);
    }
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  bindTouchControls() {
    this.touchButtons = document.querySelectorAll("[data-control]");

    this.touchButtons.forEach((button) => {
      const control = button.dataset.control;

      const press = (event) => {
        event.preventDefault();
        if (!this.active) return;

        button.classList.add("pressed");

        if (control === "jump") {
          this.jumpRequested = true;
        } else {
          this.keys.add(control);
        }

        try {
          button.setPointerCapture(event.pointerId);
        } catch {
          // Захват указателя необязателен.
        }
      };

      const release = (event) => {
        event.preventDefault();
        button.classList.remove("pressed");
        this.keys.delete(control);
      };

      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
      });
    });
  }

  isLeft() {
    return (
      this.keys.has("ArrowLeft") ||
      this.keys.has("KeyA") ||
      this.keys.has("left")
    );
  }

  isRight() {
    return (
      this.keys.has("ArrowRight") ||
      this.keys.has("KeyD") ||
      this.keys.has("right")
    );
  }

  consumeJump() {
    const requested = this.jumpRequested;
    this.jumpRequested = false;
    return requested;
  }

  clear() {
    this.keys.clear();
    this.jumpRequested = false;

    this.touchButtons?.forEach((button) => {
      button.classList.remove("pressed");
    });
  }

  setActive(active) {
    this.active = active;
    if (!active) this.clear();
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.clear();
  }
}
