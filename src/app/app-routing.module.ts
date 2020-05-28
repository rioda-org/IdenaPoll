import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SigninComponent} from '@app-core/signin/signin.component';
import {HomeComponent} from '@app-core/home/home.component';
import {CreateComponent} from '@app-core/create/create.component';


const routes: Routes = [
  {path: 'signin', component: SigninComponent},
  {path: 'home', component: HomeComponent},
  {path: 'create', component: CreateComponent},
  {
    path: '**',
    redirectTo: '/home',
    pathMatch: 'full'
  }];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
