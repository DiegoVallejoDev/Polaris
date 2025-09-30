/**
 * Base action interface for all game/domain actions
 */

import { Identifiable, Serializable, Comparable, Hashable } from '../../types/common';

/**
 * Base interface that all actions must implement
 */
export interface Action extends Identifiable, Serializable, Comparable<Action>, Hashable {
  /** Type identifier for this action */
  readonly type: string;
  
  /** Human-readable description of the action */
  readonly description: string;
  
  /** Whether this action is valid in the current context */
  isValid(): boolean;
  
  /** Get the cost or complexity of this action */
  getCost(): number;
  
  /** Additional metadata about the action */
  getMetadata(): Record<string, any>;
}

/**
 * Base abstract implementation of Action
 */
export abstract class BaseAction implements Action {
  public readonly id: string;
  public readonly type: string;
  public readonly description: string;

  protected constructor(id: string, type: string, description: string) {
    this.id = id;
    this.type = type;
    this.description = description;
  }

  abstract isValid(): boolean;
  abstract getCost(): number;
  abstract getMetadata(): Record<string, any>;
  abstract serialize(): string;
  abstract getHashKey(): string;
  abstract equals(other: Action): boolean;

  toString(): string {
    return `${this.type}(${this.description})`;
  }
}