import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatCheckboxModule } from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgSelectModule } from '@ng-select/ng-select';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NotFoundComponent } from './not-found/not-found.component';
import { RoutingService } from './routing.service';
import { MapService } from './services/map.service';

@NgModule({
    declarations: [
        // add components here
        AppComponent,
        NotFoundComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        NgSelectModule,
        HttpClientModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        HttpLinkModule,
        MatButtonModule,
        MatCheckboxModule
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
