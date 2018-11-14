import { GraphComponent } from './graph/graph.component';
import { SearchContainerComponent } from './search-container/search-container.component';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MaterialModule } from './material.module';
import { NotFoundComponent } from './not-found/not-found.component';
import { RoutingService } from './routing.service';
import { SearchComponent } from './search/search.component';
import { TickerService } from './services/ticker.service';

@NgModule({
    declarations: [
        // add components here
        AppComponent,
        NotFoundComponent,
        SearchComponent,
        SearchContainerComponent,
        GraphComponent
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
        FlexLayoutModule,
        NgxChartsModule
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
