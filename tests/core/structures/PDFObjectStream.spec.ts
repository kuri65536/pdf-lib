import pako from 'pako';

import {
  mergeIntoTypedArray,
  PDFContext,
  PDFHexString,
  PDFObject,
  PDFObjectStream,
  PDFRef,
  PDFString,
  toCharCode,
  typedArrayFor,
} from 'src/index';

describe(`PDFObjectStream`, () => {
  const context = PDFContext.create();

  const objects: Array<[PDFRef, PDFObject]> = [
    [context.nextRef(), context.obj([])],
    [context.nextRef(), context.obj(true)],
    [context.nextRef(), context.obj({})],
    [context.nextRef(), PDFHexString.of('ABC123')],
    [context.nextRef(), PDFRef.of(21)],
    [context.nextRef(), context.obj('QuxBaz')],
    [context.nextRef(), context.obj(null)],
    [context.nextRef(), context.obj(21)],
    [context.nextRef(), PDFString.of('Stuff and thingz')],
  ];

  it(`can be constructed from PDFObjectStream.of(...)`, () => {
    expect(
      PDFObjectStream.withContextAndObjects(context, objects, false),
    ).toBeInstanceOf(PDFObjectStream);
  });

  it(`can be cloned`, () => {
    const original = PDFObjectStream.withContextAndObjects(
      context,
      objects,
      false,
    );
    const clone = original.clone();
    expect(clone).not.toBe(original);
    expect(String(clone)).toBe(String(original));
  });

  it(`can be converted to a string`, () => {
    expect(
      String(PDFObjectStream.withContextAndObjects(context, objects, false)),
    ).toEqual(
      '<<\n/Type /ObjStm\n/N 9\n/First 42\n/Length 126\n>>\n' +
        'stream\n' +
        '1 0 2 4 3 9 4 15 5 24 6 31 7 39 8 44 9 47 ' +
        '[ ]\n' +
        'true\n' +
        '<<\n>>\n' +
        '<ABC123>\n' +
        '21 0 R\n' +
        '/QuxBaz\n' +
        'null\n' +
        '21\n' +
        '(Stuff and thingz)\n' +
        '\nendstream',
    );
  });

  it(`can provide its size in bytes`, () => {
    expect(
      PDFObjectStream.withContextAndObjects(
        context,
        objects,
        false,
      ).sizeInBytes(),
    ).toBe(190);
  });

  it(`can be serialized`, () => {
    const stream = PDFObjectStream.withContextAndObjects(
      context,
      objects,
      false,
    );
    const buffer = new Uint8Array(stream.sizeInBytes() + 3).fill(
      toCharCode(' '),
    );
    expect(stream.copyBytesInto(buffer, 2)).toBe(190);
    expect(buffer).toEqual(
      typedArrayFor(
        '  <<\n/Type /ObjStm\n/N 9\n/First 42\n/Length 126\n>>\n' +
          'stream\n' +
          '1 0 2 4 3 9 4 15 5 24 6 31 7 39 8 44 9 47 ' +
          '[ ]\n' +
          'true\n' +
          '<<\n>>\n' +
          '<ABC123>\n' +
          '21 0 R\n' +
          '/QuxBaz\n' +
          'null\n' +
          '21\n' +
          '(\xfe\xff\0S\0t\0u\0f\0f\0 \0a\0n\0d\0 \0t\0h\0i\0n\0g\0z)\n' +
          '\nendstream ',
      ),
    );
  });

  it(`can be serialized when encoded, PDFObjectStream`, () => {
    const contents =
      '1 0 2 4 3 9 4 15 5 24 6 31 7 39 8 44 9 47 ' +
      '[ ]\n' +
      'true\n' +
      '<<\n>>\n' +
      '<ABC123>\n' +
      '21 0 R\n' +
      '/QuxBaz\n' +
      'null\n' +
      '21\n' +
      '(\xfe\xff\0S\0t\0u\0f\0f\0 \0a\0n\0d\0 \0t\0h\0i\0n\0g\0z)\n';
    // FE and FF were splited into 2 bytes in pako.deflate("string"),
    // convert to array to prevent the behavior before deflate.
    const rawContents = contents.split('').map((i) => i.charCodeAt(0) & 0xff);
    const encodedContents = pako.deflate(rawContents);

    const stream = PDFObjectStream.withContextAndObjects(
      context,
      objects,
      true,
    );
    const buffer = new Uint8Array(stream.sizeInBytes() + 3).fill(
      toCharCode(' '),
    );
    expect(stream.copyBytesInto(buffer, 2)).toBe(206);
    expect(buffer).toEqual(
      mergeIntoTypedArray(
        '  <<\n/Filter /FlateDecode\n/Type /ObjStm\n/N 9\n/First 42\n' +
          '/Length 121\n>>\n',
        'stream\n',
        encodedContents,
        '\nendstream ',
      ),
    );
  });
});
