export const fixUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('https://')) return url;

    // Replace localhost or 127.0.0.1 with 10.0.2.2 for Android Emulator
    // In a real device, this should be the server's local IP
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
};
