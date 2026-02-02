import { Injectable } from '@angular/core';
import { Observable, defer, finalize, share, Subject } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private currentRefresh$: Observable<string> | null = null;


  refreshToken(refreshFn: () => Observable<string>): Observable<string> {
    
    if (this.currentRefresh$) {
      return this.currentRefresh$;
    }

    
    this.currentRefresh$ = defer(() => refreshFn()).pipe(
      share({
        connector: () => new Subject(),
        resetOnError: false,
        resetOnComplete: false,
        resetOnRefCountZero: false,
      }),
      finalize(() => {
        
        this.currentRefresh$ = null;
      })
    );

    return this.currentRefresh$;
  }
}
