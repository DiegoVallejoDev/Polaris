/**
 * Mathematical utility functions for POLARIS
 */

/**
 * Mathematical utilities for MCTS and evaluations
 */
export class MathUtils {
  /**
   * Calculate UCB1 value for node selection
   */
  static ucb1(value: number, visits: number, parentVisits: number, c: number = Math.sqrt(2)): number {
    if (visits === 0) return Infinity;
    return value + c * Math.sqrt(Math.log(parentVisits) / visits);
  }

  /**
   * Normalize an array of values to [0, 1]
   */
  static normalize(values: number[]): number[] {
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) return values.map(() => 0.5);
    
    return values.map(value => (value - min) / range);
  }

  /**
   * Calculate entropy of a probability distribution
   */
  static entropy(distribution: number[]): number {
    if (distribution.length === 0) return 0;
    
    return -distribution.reduce((entropy, prob) => {
      if (prob <= 0) return entropy;
      return entropy + prob * Math.log2(prob);
    }, 0);
  }

  /**
   * Calculate variance of a set of values
   */
  static variance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return values.reduce((variance, value) => variance + Math.pow(value - mean, 2), 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  static standardDeviation(values: number[]): number {
    return Math.sqrt(this.variance(values));
  }

  /**
   * Sigmoid function
   */
  static sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Softmax function
   */
  static softmax(values: number[]): number[] {
    if (values.length === 0) return [];
    
    const maxValue = Math.max(...values);
    const expValues = values.map(value => Math.exp(value - maxValue));
    const sumExp = expValues.reduce((sum, exp) => sum + exp, 0);
    
    return expValues.map(exp => exp / sumExp);
  }

  /**
   * Clamp a value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation between two values
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Calculate weighted average
   */
  static weightedAverage(values: number[], weights: number[]): number {
    if (values.length !== weights.length || values.length === 0) {
      throw new Error('Values and weights arrays must have the same non-zero length');
    }
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = values.reduce((sum, value, index) => sum + value * weights[index], 0);
    return weightedSum / totalWeight;
  }
}

/**
 * Random number utilities with seeding support
 */
export class RandomUtils {
  private static seed: number = Date.now();

  /**
   * Set the random seed for reproducibility
   */
  static setSeed(newSeed: number): void {
    this.seed = newSeed;
  }

  /**
   * Generate a pseudo-random number between 0 and 1
   */
  static random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate a random integer between min and max (inclusive)
   */
  static randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Choose a random element from an array
   */
  static choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Choose a random element based on weights
   */
  static weightedChoice<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length || items.length === 0) {
      throw new Error('Items and weights arrays must have the same non-zero length');
    }
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) {
      throw new Error('Total weight must be positive');
    }
    
    let randomValue = this.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      randomValue -= weights[i];
      if (randomValue <= 0) {
        return items[i];
      }
    }
    
    // Fallback (shouldn't happen with proper weights)
    return items[items.length - 1];
  }

  /**
   * Generate random number from normal distribution using Box-Muller transform
   */
  static normalRandom(mean: number = 0, stdDev: number = 1): number {
    let u = 0, v = 0;
    while (u === 0) u = this.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = this.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
  }
}