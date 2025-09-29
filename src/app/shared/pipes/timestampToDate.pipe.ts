import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timestampToDate'
})
export class TimestampToDatePipe implements PipeTransform {
  // this pipe for converting Firestore Timestamp to JavaScript Date
  transform(value: { seconds: number; nanoseconds: number }): Date | null {
    if (!value || typeof value.seconds !== 'number') {
      return null;
    }
    const millis = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1_000_000);
    return new Date(millis);
  }
}
