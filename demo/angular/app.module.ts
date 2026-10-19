import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CounterComponent } from './counter.component';

@NgModule({
  declarations: [CounterComponent],
  imports: [BrowserModule],
  bootstrap: [CounterComponent]
})
export class AppModule {}
