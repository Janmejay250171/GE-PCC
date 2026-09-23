import { PolicyDocument } from '../types/policy.js';

class InMemoryPolicyStore {
  private store = new Map<string, PolicyDocument>();

  public get(id: string): PolicyDocument | null {
    const item = this.store.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  public set(id: string, policy: any): PolicyDocument {
    const cloned = JSON.parse(JSON.stringify(policy));
    this.store.set(id, cloned);
    return JSON.parse(JSON.stringify(cloned));
  }

  public has(id: string): boolean {
    return this.store.has(id);
  }

  public clear(): void {
    this.store.clear();
  }
}

export const inMemoryPolicyStore = new InMemoryPolicyStore();
