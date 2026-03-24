import { BluetoothEscposPrinter } from 'react-native-bluetooth-escpos-printer';
import TcpSocket from 'react-native-tcp-socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface PrintItem {
  name: string;
  quantity: number;
  price: number;
}

export interface PrintData {
  customerName: string;
  customerPhone: string;
  items: PrintItem[];
  totalAmount: number;
  subtotal?: number;
  gstAmount?: number;
  billId: string | number;
  date: string;
}

export interface BusinessInfo {
  storeName: string;
  tagline: string;
  phone: string;
  address: string;
  gstNumber: string;
  footerMessage: string;
  showLogo?: boolean;
  logoBase64?: string;
  upiId?: string;
  showQRCode?: boolean;
}

export const printReceipt = async (data: PrintData) => {
  try {
    const configStr = await AsyncStorage.getItem('printer_config');
    if (!configStr) {
      Alert.alert('Printer Not Configured', 'Please go to Settings > Printer Setup first.');
      return;
    }
    const config = JSON.parse(configStr);

    const businessStr = await AsyncStorage.getItem('business_info');
    const businessInfo: BusinessInfo = businessStr ? JSON.parse(businessStr) : {
      storeName: 'BILLING APP',
      tagline: 'STORE RECEIPT',
      phone: '',
      address: '',
      gstNumber: '',
      footerMessage: 'Thank You! Visit Again.'
    };

    if (config.type === 'bluetooth') {
      await printBluetooth(data, businessInfo);
    } else if (config.type === 'wifi') {
      await printWiFi(data, config.ip, config.port, businessInfo);
    } else {
      Alert.alert('Unsupported Printer', 'The selected printer type is not supported yet.');
    }
  } catch (error) {
    console.error('Print error:', error);
    Alert.alert('Printing Failed', 'An error occurred while trying to print.');
  }
};

const printBluetooth = async (data: PrintData, bInfo: BusinessInfo) => {
  try {
    await BluetoothEscposPrinter.printerInit();
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);

    // Print Logo if enabled
    if (bInfo.showLogo && bInfo.logoBase64) {
      await BluetoothEscposPrinter.printPic(bInfo.logoBase64, { width: 200, left: 0 });
      await BluetoothEscposPrinter.printText("\n", {});
    }

    await BluetoothEscposPrinter.printText(`${bInfo.storeName}\n`, { fontweight: 1, padding: 0 });
    
    if (bInfo.tagline) await BluetoothEscposPrinter.printText(`${bInfo.tagline}\n`, { fontweight: 0, padding: 0 });
    if (bInfo.address) await BluetoothEscposPrinter.printText(`${bInfo.address.replace(/\n/g, ', ')}\n`, { fontweight: 0, padding: 0 });
    if (bInfo.phone) await BluetoothEscposPrinter.printText(`Ph: ${bInfo.phone}\n`, { fontweight: 0, padding: 0 });
    if (bInfo.gstNumber) await BluetoothEscposPrinter.printText(`GSTIN: ${bInfo.gstNumber}\n`, { fontweight: 0, padding: 0 });
    
    await BluetoothEscposPrinter.printText("--------------------------------\n", {});
    
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText(`Bill ID : #ORD-${data.billId}\n`, {});
    await BluetoothEscposPrinter.printText(`Date    : ${data.date}\n`, {});
    await BluetoothEscposPrinter.printText(`Customer: ${data.customerName}\n`, {});
    await BluetoothEscposPrinter.printText(`Phone   : ${data.customerPhone}\n`, {});
    await BluetoothEscposPrinter.printText("--------------------------------\n", {});

    await BluetoothEscposPrinter.printColumn(
      [14, 6, 12],
      [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.RIGHT],
      ["Item", "Qty", "Price"],
      {}
    );
    await BluetoothEscposPrinter.printText("--------------------------------\n", {});

    for (const item of data.items) {
      await BluetoothEscposPrinter.printColumn(
        [14, 6, 12],
        [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.RIGHT],
        [item.name.substring(0, 14), String(item.quantity), `Rs.${item.price * item.quantity}`],
        {}
      );
    }

    await BluetoothEscposPrinter.printText("--------------------------------\n", {});
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.RIGHT);
    
    if (data.gstAmount && data.gstAmount > 0) {
        await BluetoothEscposPrinter.printText(`Subtotal: Rs.${data.subtotal}\n`, {});
        await BluetoothEscposPrinter.printText(`GST (18%): Rs.${data.gstAmount}\n`, {});
    }
    
    await BluetoothEscposPrinter.printText(`TOTAL: Rs.${data.totalAmount}\n`, { fontweight: 1 });
    await BluetoothEscposPrinter.printText("\n", {});

    // Print QR Code if enabled
    if (bInfo.showQRCode && bInfo.upiId) {
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText("Scan to Pay with UPI\n", { fontweight: 0 });
      const upiUrl = `upi://pay?pa=${bInfo.upiId}&pn=${encodeURIComponent(bInfo.storeName)}&am=${data.totalAmount}&cu=INR`;
      await BluetoothEscposPrinter.printQRCode(upiUrl, 250, 1);
      await BluetoothEscposPrinter.printText("\n", {});
    }

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText(`${bInfo.footerMessage}\n`, {});
    await BluetoothEscposPrinter.printText("\n\n\n", {});
  } catch (e: any) {
    throw new Error(`Bluetooth Print Error: ${e.message}`);
  }
};

const printWiFi = async (data: PrintData, ip: string, port: string, bInfo: BusinessInfo) => {
  return new Promise<void>((resolve, reject) => {
    const client = TcpSocket.createConnection({ port: Number(port), host: ip }, () => {
      const init = '\x1B\x40';
      const center = '\x1B\x61\x01';
      const left = '\x1B\x61\x00';
      const right = '\x1B\x61\x02';
      const boldOn = '\x1B\x45\x01';
      const boldOff = '\x1B\x45\x00';
      const feed = '\x0A';
      const cut = '\x1D\x56\x00';

      let receipt = init + center + boldOn + bInfo.storeName.toUpperCase() + "\n" + boldOff;
      if (bInfo.tagline) receipt += bInfo.tagline + "\n";
      if (bInfo.address) receipt += bInfo.address.replace(/\n/g, ', ') + "\n";
      if (bInfo.phone) receipt += "Ph: " + bInfo.phone + "\n";
      if (bInfo.gstNumber) receipt += "GSTIN: " + bInfo.gstNumber + "\n";
      receipt += left + "--------------------------------\n";
      receipt += `Bill ID : #ORD-${data.billId}\n`;
      receipt += `Date    : ${data.date}\n`;
      receipt += `Customer: ${data.customerName}\n`;
      receipt += `Phone   : ${data.customerPhone}\n`;
      receipt += "--------------------------------\n";
      
      receipt += "Item           Qty     Price\n";
      receipt += "--------------------------------\n";
      
      data.items.forEach(item => {
        const name = item.name.substring(0, 14).padEnd(14);
        const qty = String(item.quantity).padStart(5);
        const price = `Rs.${item.price * item.quantity}`.padStart(10);
        receipt += `${name}${qty}${price}\n`;
      });

      receipt += "--------------------------------\n";
      receipt += right;
      
      if (data.gstAmount && data.gstAmount > 0) {
          receipt += `Subtotal: Rs.${data.subtotal}\n`;
          receipt += `GST (18%): Rs.${data.gstAmount}\n`;
      }
      
      receipt += boldOn + `TOTAL: Rs.${data.totalAmount}\n` + boldOff + feed;
      receipt += center + bInfo.footerMessage + "\n" + feed + feed + feed + cut;

      client.write(receipt);
      client.end();
      resolve();
    });

    client.on('error', (error) => {
      client.destroy();
      reject(new Error(`WiFi Print Error: ${error.message}`));
    });

    client.on('timeout', () => {
      client.destroy();
      reject(new Error('WiFi Print Timeout'));
    });
    
    // Set a timeout
    setTimeout(() => {
      client.destroy();
      reject(new Error('WiFi Connection Timeout'));
    }, 5000);
  });
};
