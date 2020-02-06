import pako from 'pako';

import {
  mergeIntoTypedArray,
  moveText,
  PDFContentStream,
  PDFContext,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFOperator,
  PDFOperatorNames as Ops,
  PDFString,
  popGraphicsState,
  pushGraphicsState,
  toCharCode,
  typedArrayFor,
} from 'src/index';

describe(`PDFContentStream`, () => {
  const context = PDFContext.create();
  const dict = PDFDict.withContext(context);
  const operators = [
    PDFOperator.of(Ops.BeginText),
    PDFOperator.of(Ops.SetFontAndSize, [PDFName.of('F1'), PDFNumber.of(24)]),
    PDFOperator.of(Ops.MoveText, [PDFNumber.of(100), PDFNumber.of(100)]),
    PDFOperator.of(Ops.ShowText, [PDFString.of('Hello World and stuff!')]),
    PDFOperator.of(Ops.EndText),
  ];

  it(`can be constructed from PDFContentStream.of(...)`, () => {
    expect(PDFContentStream.of(dict, operators, false)).toBeInstanceOf(
      PDFContentStream,
    );
  });

  it(`allows operators to be pushed to the end of the stream`, () => {
    const stream = PDFContentStream.of(dict, [pushGraphicsState()], false);
    stream.push(moveText(21, 99), popGraphicsState());
    expect(String(stream)).toEqual(
      '<<\n/Length 13\n>>\n' +
        'stream\n' +
        'q\n' +
        '21 99 Td\n' +
        'Q\n' +
        '\nendstream',
    );
  });

  it(`can be cloned`, () => {
    const original = PDFContentStream.of(dict, operators, false);
    const clone = original.clone();
    expect(clone).not.toBe(original);
    expect(String(clone)).toBe(String(original));
  });

  it(`can be converted to a string`, () => {
    expect(String(PDFContentStream.of(dict, operators, false))).toEqual(
      '<<\n/Length 79\n>>\n' +
        'stream\n' +
        'BT\n' +
        '/F1 24 Tf\n' +
        '100 100 Td\n' +
        '(Hello World and stuff!) Tj\n' +
        'ET\n' +
        '\nendstream',
    );
  });

  it(`can provide its size in bytes`, () => {
    expect(PDFContentStream.of(dict, operators, false).sizeInBytes()).toBe(113);
  });

  it(`can be serialized`, () => {
    const stream = PDFContentStream.of(dict, operators, false);
    const buffer = new Uint8Array(stream.sizeInBytes() + 3).fill(
      toCharCode(' '),
    );
    expect(stream.copyBytesInto(buffer, 2)).toBe(113);
    expect(buffer).toEqual(
      typedArrayFor(
        '  <<\n/Length 79\n>>\n' +
          'stream\n' +
          'BT\n' +
          '/F1 24 Tf\n' +
          '100 100 Td\n' +
          '(\xfe\xff\0H\0e\0l\0l\0o\0 \0W\0o\0r\0l\0d\0 ' +
          '\0a\0n\0d\0 \0s\0t\0u\0f\0f\0!) Tj\n' +
          'ET\n' +
          '\nendstream ',
      ),
    );
  });

  it(`can be serialized when encoded`, () => {
    const contents =
      'BT\n' +
      '/F1 24 Tf\n' +
      '100 100 Td\n' +
      '(\xfe\xff\0H\0e\0l\0l\0o\0 \0W\0o\0r\0l\0d\0 ' +
      '\0a\0n\0d\0 \0s\0t\0u\0f\0f\0!) Tj\n' +
      'ET\n';
    // FE and FF were splited into 2 bytes in pako.deflate("string"),
    // convert to array to prevent the behavior before deflate.
    const rawContents = contents.split('').map((i) => i.charCodeAt(0) & 0xff);
    const encodedContents = pako.deflate(rawContents);

    const stream = PDFContentStream.of(dict, operators, true);
    const buffer = new Uint8Array(stream.sizeInBytes() + 3).fill(
      toCharCode(' '),
    );
    expect(stream.copyBytesInto(buffer, 2)).toBe(129);
    expect(buffer).toEqual(
      mergeIntoTypedArray(
        '  <<\n/Length 74\n/Filter /FlateDecode\n>>\n',
        'stream\n',
        encodedContents,
        '\nendstream ',
      ),
    );
  });
});
