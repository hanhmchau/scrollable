import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgSelectModule } from '@ng-select/ng-select';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MaterialModule } from './material.module';
import { NotFoundComponent } from './not-found/not-found.component';
import { RoutingService } from './routing.service';
import { SearchComponent } from './search/search.component';
import { MapService } from './services/map.service';

@NgModule({
    declarations: [
        // add components here
        AppComponent,
        NotFoundComponent,
        SearchComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        NgSelectModule,
        HttpClientModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MaterialModule,
        FlexLayoutModule
    ],
    exports: [],
    providers: [
        RoutingService,
        MapService,
        // add injectable things here
    ],
    bootstrap: [AppComponent]
})
export class AppModule {}
