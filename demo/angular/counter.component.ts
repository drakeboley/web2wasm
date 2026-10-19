import { Component, OnInit } from '@angular/core';
import { FeatherStateService } from '../src';

@Component({
  selector: 'app-counter',
  template: `<button (click)=inc()>Increment: {{count}}</button>`
})
export class CounterComponent implements OnInit {
  count = 0;
  constructor(private state: FeatherStateService) {}
  ngOnInit(){ this.count = this.state.get('count') ?? 0; }
  inc(){ const newVal=(this.state.get('count')||0)+1; this.state.set('count',newVal); this.count=newVal; }
}
