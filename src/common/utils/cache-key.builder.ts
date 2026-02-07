export class CacheKeyBuilder {
  private parts: string[] = [];

  static create(): CacheKeyBuilder {
    return new CacheKeyBuilder();
  }

  service(name: string): this {
    this.parts.push(name);
    return this;
  }

  resource(type: string): this {
    this.parts.push(type);
    return this;
  }

  id(identifier: string): this {
    this.parts.push(identifier);
    return this;
  }

  scope(scope: string): this {
    this.parts.push(scope);
    return this;
  }

  page(pageNum: number): this {
    this.parts.push('page', pageNum.toString());
    return this;
  }

  query(q: string): this {
    // Sanitize query for cache key
    const sanitized = q.toLowerCase().replace(/[^a-z0-9]/g, '_');
    this.parts.push('query', sanitized);
    return this;
  }

  version(v: string = 'v1'): this {
    this.parts.push(v);
    return this;
  }

  build(): string {
    return this.parts.join(':');
  }
}
