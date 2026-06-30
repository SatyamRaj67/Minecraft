export interface RenderPass {
    readonly name: string;

    onInit(device: GPUDevice, format: GPUTextureFormat): void;

    onResize?(width: number, height: number): void;

    execute(
        encoder: GPUCommandEncoder,
        resources: ReadonlyMap<string, GPUTextureView>,
    ): void;

    onDestroy(): void;

    lastDrawCallCount?: number;
}