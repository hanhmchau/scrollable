import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchContainerComponent } from './search-container/search-container.component';
import { GraphComponent } from './graph/graph.component';
import { NotFoundComponent } from './not-found/not-found.component';

const routes: Routes = [
    {
        path: '',
        component: SearchContainerComponent,
        pathMatch: 'full'
    },
    {
        path: 'ticker/:symbol',
        component: GraphComponent
    },
    { path: '**', component: NotFoundComponent }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
