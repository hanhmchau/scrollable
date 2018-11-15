import { NgModule } from '@angular/core';
import {
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatToolbarModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule
} from '@angular/material';

const modules = [
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatToolbarModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule
];

@NgModule({
    imports: modules,
    exports: modules
})
export class MaterialModule {}
