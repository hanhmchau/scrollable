import { Component, Input } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-not-found',
})
export class UnsubscriberComponent {
    protected onDestroyed = new Subject();

    ngOnDestroy(): void {
        this.onDestroyed.next();
        this.onDestroyed.unsubscribe();
    }
}
