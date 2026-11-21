import { messages } from "./locales";
export class GameError extends Error {
  constructor(readonly code: keyof typeof messages.errors) {
    super(messages.errors[code]);
    this.name = "GameError";
  }
}
