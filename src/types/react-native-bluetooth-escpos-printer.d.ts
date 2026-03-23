declare module 'react-native-bluetooth-escpos-printer' {
    export class BluetoothManager {
        static scanDevices(): Promise<string>;
        static connect(address: string): Promise<void>;
        static isBluetoothEnabled(): Promise<boolean>;
        static EVENT_DEVICE_ALREADY_PAIRED: string;
        static EVENT_DEVICE_FOUND: string;
        static EVENT_CONNECTION_LOST: string;
        static EVENT_UNABLE_TO_CONNECT: string;
        static EVENT_CONNECTED: string;
        static EVENT_BLUETOOTH_NOT_SUPPORT: string;
    }
    export class BluetoothEscposPrinter {
        static printText(text: string, options?: any): Promise<void>;
        static printerInit(): Promise<void>;
        static printerLeftSpace(space: number): Promise<void>;
        static printerLineSpace(space: number): Promise<void>;
        static printerUnderLine(line: number): Promise<void>;
        static printerAlign(align: number): Promise<void>;
        static printColumn(columnWidths: number[], columnAligns: number[], columnTexts: string[], options?: any): Promise<void>;
        static setWidth(width: number): Promise<void>;
        static printPic(base64: string, options?: any): Promise<void>;
        static selfTest(): Promise<void>;
        static rotate(): Promise<void>;
        static setBlob(weight: number): Promise<void>;
        static printQRCode(content: string, size: number, correctionLevel: number): Promise<void>;
        static printBarCode(content: string, type: number, width: number, height: number, labelPosition: number, labelFont: number): Promise<void>;
        
        static ALIGN: {
            LEFT: number;
            CENTER: number;
            RIGHT: number;
        };
    }
}
