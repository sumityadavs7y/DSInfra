// Convert number to words (Indian numbering system)
function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    // Handle decimal by splitting
    const numStr = parseFloat(num).toFixed(2);
    const parts = numStr.split('.');
    let integerPart = parseInt(parts[0]);
    const decimalPart = parseInt(parts[1]);

    let words = '';

    // Crores
    if (integerPart >= 10000000) {
        words += convertHundreds(Math.floor(integerPart / 10000000)) + ' Crore ';
        integerPart %= 10000000;
    }

    // Lakhs
    if (integerPart >= 100000) {
        words += convertHundreds(Math.floor(integerPart / 100000)) + ' Lakh ';
        integerPart %= 100000;
    }

    // Thousands
    if (integerPart >= 1000) {
        words += convertHundreds(Math.floor(integerPart / 1000)) + ' Thousand ';
        integerPart %= 1000;
    }

    // Hundreds
    if (integerPart >= 100) {
        words += ones[Math.floor(integerPart / 100)] + ' Hundred ';
        integerPart %= 100;
    }

    // Tens and ones
    if (integerPart >= 20) {
        words += tens[Math.floor(integerPart / 10)] + ' ';
        integerPart %= 10;
    }

    if (integerPart >= 10) {
        words += teens[integerPart - 10] + ' ';
        integerPart = 0;
    }

    if (integerPart > 0) {
        words += ones[integerPart] + ' ';
    }

    // Add paise if decimal exists
    if (decimalPart > 0) {
        words += 'and ' + convertHundreds(decimalPart) + ' Paise ';
    }

    return words.trim();

    function convertHundreds(n) {
        let str = '';
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n >= 10) {
            str += teens[n - 10] + ' ';
            return str.trim();
        }
        if (n > 0) {
            str += ones[n] + ' ';
        }
        return str.trim();
    }
}

module.exports = {
    numberToWords
};

