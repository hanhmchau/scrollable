import { NgModule } from '@angular/core';
import { MatButtonModule, MatCheckboxModule, MatIconModule } from '@angular/material';

const modules = [MatButtonModule, MatCheckboxModule, MatIconModule];

@NgModule({
    imports: modules,
    exports: modules
})
export class MaterialModule {}
