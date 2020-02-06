import PDFObject from 'src/core/objects/PDFObject';
import CharCodes from 'src/core/syntax/CharCodes';
import { padStart } from 'src/utils';

class PDFString extends PDFObject {
  // The PDF spec allows newlines and parens to appear directly within a literal
  // string. These character _may_ be escaped. But they do not _have_ to be. So
  // for simplicity, we will not bother escaping them.
  static of = (value: string) => new PDFString(value);

  static fromDate = (date: Date) => {
    const year = padStart(String(date.getUTCFullYear()), 4, '0');
    const month = padStart(String(date.getUTCMonth() + 1), 2, '0');
    const day = padStart(String(date.getUTCDate()), 2, '0');
    const hours = padStart(String(date.getUTCHours()), 2, '0');
    const mins = padStart(String(date.getUTCMinutes()), 2, '0');
    const secs = padStart(String(date.getUTCSeconds()), 2, '0');
    return new PDFString(`D:${year}${month}${day}${hours}${mins}${secs}Z`);
  };

  private readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  clone(): PDFString {
    return PDFString.of(this.value);
  }

  toString(): string {
    return `(${this.value})`;
  }

  sizeInBytes(): number {
    const escaped = (this.value.match(/\(|\)|\\/g) || []).length;
    return this.value.length * 2 + 4 + escaped;
  }

  copyByteAndEscape(src: number, buffer: Uint8Array, offset: number): number {
    let n = 0;
    src = src & 0xff;
    if (
      src === CharCodes.LeftParen ||
      src === CharCodes.RightParen ||
      src === CharCodes.BackSlash
    ) {
      buffer[offset++] = CharCodes.BackSlash; // escape by backslash
      n++;
    }
    buffer[offset++] = src;
    return n + 1;
  }

  copyBytesInto(buffer: Uint8Array, offset: number): number {
    let n = 3;
    buffer[offset++] = CharCodes.LeftParen;
    // decode string as UTF16BE (PDF spec 7.9.2.2
    buffer[offset++] = CharCodes.BOM1; // BOM upper
    buffer[offset++] = CharCodes.BOM2; // BOM lower
    const src = this.value;
    for (let i = 0; i < src.length; i++) {
      const utf16code = src.charCodeAt(i);
      const j = this.copyByteAndEscape(utf16code >> 8, buffer, offset);
      offset += j;
      n += j;
      const k = this.copyByteAndEscape(utf16code, buffer, offset);
      offset += k;
      n += k;
    }
    buffer[offset++] = CharCodes.RightParen;
    return n + 1;
  }
}

export default PDFString;
