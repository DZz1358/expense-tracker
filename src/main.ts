import { registerLocaleData } from '@angular/common';
import localeEnGb from '@angular/common/locales/en-GB';
import localeRu from '@angular/common/locales/ru';
import localeUk from '@angular/common/locales/uk';
import { bootstrapApplication } from '@angular/platform-browser';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

registerLocaleData(localeEnGb, 'en-GB');
registerLocaleData(localeRu, 'ru');
registerLocaleData(localeUk, 'uk');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
