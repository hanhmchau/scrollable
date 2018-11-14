import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchContainerComponent } from './search-container/search-container.component';
import { GraphComponent } from './graph/graph.component';

const routes: Routes = [
    {
        path: '',
        component: SearchContainerComponent,
        pathMatch: 'full'
    },
    {
        path: 'ticker/:symbol',
        component: GraphComponent
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
