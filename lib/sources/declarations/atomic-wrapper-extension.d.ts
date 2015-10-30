///<reference path="../DefinitelyTyped/atom/atom.d.ts" />

declare namespace eventKit {
  interface Disposable {
    disposed: boolean;
    dispose(): void;
  }
  interface DisposableConstructor {
    new (disposalAction: any): Disposable;
    prototype: Disposable
  }
}

declare namespace AtomCore {
  interface IDisplayBuffer {
    _nonatomic_findWrapColumn: (line: string, softWrapColumn: number) => number;
    isSoftWrapped(): boolean;
    getClientWidth(): number;
  }
  interface IConfig {
    onDidChange(callback: any): eventKit.Disposable;
    onDidChange(keyPath: string, callback: (ev: ICallbackEvent) => any): eventKit.Disposable;
    onDidChange(scopeDescriptor: string[], keyPath: string, callback: (ev: ICallbackEvent) => any): eventKit.Disposable;
  }
  interface ICallbackEvent {
    newValue: any;
    oldValue: any;
    keyPath: string;
  }
}
