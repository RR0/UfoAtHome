/**
 * An approximative date property (year, month or day).
 */
export class DateApproxPart {
  constructor(public value: number, private size: number, public unspecified?: boolean, public approximate?: boolean,
              public uncertain?: boolean) {
  }

  toEDTF() {
    return this.unspecified ? Array(this.size + 1).join('u') :
      DateApprox.zeroPadding(this.value, this.size) + (this.approximate ? '~' : '') + (this.uncertain ? '?' : '');
  }
}

/**
 * An approximative date.
 */
export class DateApprox {

  static toDateApproxPart(edtfPart: string, size: number) {
    return new DateApproxPart(parseInt(edtfPart, 10) || 0, size, edtfPart.charAt(0) === 'u', edtfPart.charAt(
      edtfPart.length - 1) === '~', edtfPart.charAt(edtfPart.length - 1) === '?');
  }

  static fromEDTFParts(edtfYear: string, edtfMonth: string, edtfDay: string) {
    return new DateApprox(DateApprox.toDateApproxPart(edtfYear, 4), DateApprox.toDateApproxPart(edtfMonth,
      2), DateApprox.toDateApproxPart(edtfDay, 2));
  }

  static zeroPadding(value: number, size: number = 2) {
    const toPad: string = value + '';
    // tslint:disable-next-line:prefer-literal
    return toPad.length >= size ? toPad : new Array(size - toPad.length + 1).join('0') + toPad;
  }

  static fromEDTF(dateString: string) {
    const durationMarker = dateString ? dateString.indexOf('/') : -1;
    let dateApprox;
    if (durationMarker > 0) {
      dateApprox = {
        start: DateApprox.singleFromEDTF(dateString.substring(0, durationMarker)),
        end: DateApprox.singleFromEDTF(dateString.substring(durationMarker + 1))
      };
    } else {
      dateApprox = DateApprox.singleFromEDTF(dateString);
    }
    return dateApprox;
  }

  static dateToEDTF(date: Date) {
    if (!date) {
      return null;
    }
    return DateApprox.zeroPadding(date.getFullYear(), 4) + '-' +
      DateApprox.zeroPadding(date.getMonth() + 1) + '-' +
      DateApprox.zeroPadding(date.getDate());
  }

  private static singleFromEDTF(dateString: string) {
    let dateApprox: DateApprox;
    if (dateString) {
      const dateParts: string[] = dateString.split('-');
      const year = dateParts[0] || 'uuuu';
      const month = dateParts[1] || 'uu';
      const day = dateParts[2] || 'uu';
      dateApprox = DateApprox.fromEDTFParts(year, month, day);
    } else {
      dateApprox = DateApprox.fromEDTFParts('uuuu', 'uu', 'uu');
    }
    return dateApprox;
  }

  constructor(public year: DateApproxPart, public month: DateApproxPart, public day: DateApproxPart) {
  }

  toEDTF() {
    return `${this.year.toEDTF()}-${this.month.toEDTF()}-${this.day.toEDTF()}`;
  }
}
