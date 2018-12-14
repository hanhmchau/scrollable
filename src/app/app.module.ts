import { ScrollableComponent } from './scrollable/scrollable.component';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MaterialModule } from './material.module';
import { NotFoundComponent } from './not-found/not-found.component';
import { RoutingService } from './routing.service';
import { TickerService } from './services/ticker.service';
import { ScrollableModule } from './scrollable.module';

@NgModule({
    declarations: [
        // add components here
        AppComponent,
        NotFoundComponent,
    ],
    imports: [
        ScrollableModule,
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MaterialModule,
    ],
    exports: [],
    providers: [
        RoutingService,
        TickerService
        // add injectable things here
    ],
    bootstrap: [AppComponent]
})
export class AppModule {}
