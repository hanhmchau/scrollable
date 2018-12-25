import { Component, ElementRef, EventEmitter, Input, Output, Renderer2, ViewChild } from '@angular/core';
import { fromEvent, Observable, Observer, of, Subject, Subscription, interval } from 'rxjs';
import {
    debounceTime,
    delay,
    distinctUntilChanged,
    pairwise,
    skipWhile,
    startWith,
    takeUntil,
    throttleTime,
    switchMap,
    take,
    map
} from 'rxjs/operators';
import { UnsubscriberComponent } from '../unsubscriber/unsubscriber.component';

enum Direction {
    Up = 1,
    Down = 2
}

// tslint:disable-next-line:max-classes-per-file
@Component({
    selector: 'scrollable',
    templateUrl: './scrollable.component.html',
    styleUrls: ['./scrollable.component.scss']
})
export class ScrollableComponent extends UnsubscriberComponent {
    @ViewChild('viewport') viewportRef: ElementRef;
    @ViewChild('content') contentRef: ElementRef;
    @ViewChild('thumb') thumbRef: ElementRef;
    @ViewChild('scrollbar') scrollbarRef: ElementRef;

    @Input()
    set height(value: number) {
        this._height = value;
        this.initializeStyles();
        this.updateScrollbar();
    }
    @Input() distanceToBottom = 50;
    @Input() distanceToTop = 50;
    @Input()
    set autoHide(value: boolean) {
        this._autoHide = value;
        this.activeScrollbar = !value;
        this.updateScrollbar();
    }
    @Input() padding = 25;
    @Input() thumbClass: string;
    @Input() barClass: string;
    @Input() containerClass: string;
    @Input() thumbWidth = 8;

    @Output() reachedBottom = new EventEmitter();
    @Output() reachedTop = new EventEmitter();

    private scrolling = new Subject<number>();
    private _height: number = 300;
    private _autoHide = true;
    private scrollableZone = 25;
    private scrollbarStyle = {
        width: `${this.thumbWidth + this.scrollableZone * 2}px`,
        padding: `${this.padding}px`
    };
    private thumbStyle = {
        top: '0',
        height: '0'
    };
    private containerStyle = {
        height: `${this._height}px`,
        padding: `${this.padding}px`
    };
    private isDraggingThumb = false;
    private thumbOffset = 0;
    private mouseDragOffset = 0;
    private visibleContentHeight = 0;
    private realContentHeight = 0;
    private thumbHeight = 0;
    private showScrollbar = false;
    private activeScrollbar = false;
    private hideScrollbarSubscription = Subscription.EMPTY;

    constructor(private renderer: Renderer2) {
        super();
    }

    ngOnInit(): void {
        this.initializeStyles();
        fromEvent(document, 'mouseup')
            .pipe(
                takeUntil(this.onDestroyed),
                skipWhile(() => !this.isDraggingThumb)
            )
            .subscribe(e => {
                this.onDragEnd();
            });

        this.addScrollSubscription();
        this.addReachedEndsSubscription();
        this.pollForContentHeightChange();
    }

    initializeStyles() {
        this.containerStyle = {
            height: `${this._height}px`,
            padding: `${this.padding}px`
        };
        this.scrollbarStyle = {
            width: `${this.thumbWidth + this.scrollableZone * 2}px`,
            padding: `${this.padding}px`
        };
    }

    ngAfterContentChecked(): void {
        // this.updateScrollbar();
    }

    scrollToTop(): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            this.scrollTo(0);
            observer.next(1);
        });
    }

    scrollToBottom(): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            this.scrollTo(this.getRealContentHeight());
            observer.next(1);
        });
    }

    private pollForContentHeightChange() {
        interval(500)
            .pipe(
                takeUntil(this.onDestroyed),
                map(() => this.getRealContentHeight()),
                distinctUntilChanged()
            )
            .subscribe(contentHeight => {
                this.updateScrollbar();
            });
    }

    private onContentMouseenter() {
        this.activeScrollbar = true;
        this.hideScrollbarSubscription = of(true)
            .pipe(
                takeUntil(this.onDestroyed),
                delay(2000)
            )
            .subscribe(() => {
                this.fadeScrollbarAway();
            });
    }

    private onContentMouseleave() {
        this.hideScrollbarSubscription.unsubscribe();
        this.fadeScrollbarAway();
    }

    private addScrollSubscription() {
        const scrollEvent$ = fromEvent(this.viewportRef.nativeElement, 'scroll');
        scrollEvent$.pipe(takeUntil(this.onDestroyed)).subscribe(e => {
            this.updateScrollbar();
        });

        scrollEvent$
            .pipe(
                takeUntil(this.onDestroyed),
                debounceTime(100)
            )
            .subscribe(e => {
                this.updateScrollbar();
            });
    }

    private addReachedEndsSubscription() {
        this.scrolling
            .asObservable()
            .pipe(
                takeUntil(this.onDestroyed),
                throttleTime(100),
                startWith(0),
                distinctUntilChanged(),
                pairwise()
            )
            .subscribe(([lastOffsetTop, currentOffsetTop]) => {
                const isScrollingUp = lastOffsetTop > currentOffsetTop;
                if (isScrollingUp && currentOffsetTop <= this.distanceToTop && lastOffsetTop > this.distanceToTop) {
                    this.reachedTop.emit();
                }
                const bottomCutoff = this.getRealContentHeight() - this.distanceToBottom - this.getVisibleContentHeight();
                if (!isScrollingUp && currentOffsetTop >= bottomCutoff && lastOffsetTop < bottomCutoff) {
                    this.reachedBottom.emit();
                }
                this.hideScrollbarSubscription.unsubscribe();
                this.activeScrollbar = true;
            });
    }

    private addAutohideSubscription() {
        this.scrolling
            .asObservable()
            .pipe(
                takeUntil(this.onDestroyed),
                debounceTime(1000)
            )
            .subscribe(() => {
                this.fadeScrollbarAway();
            });
    }

    private onDragStart(event: MouseEvent) {
        this.isDraggingThumb = true;
        this.mouseDragOffset = event.clientY - this.thumbOffset;
        this.visibleContentHeight = this.getVisibleContentHeight();
        this.thumbHeight = this.calculateThumbHeight();
        return false;
    }

    private onDrag(event: MouseEvent) {
        if (this.isDraggingThumb) {
            const top = Math.min(
                Math.max(event.clientY - this.mouseDragOffset, 0),
                this.visibleContentHeight - this.thumbHeight
            );
            this.thumbStyle = {
                ...this.thumbStyle,
                top: `${top}px`
            };
            const contentOffset = this.calculateContentOffset(top);
            this.renderer.setProperty(this.viewportRef.nativeElement, 'scrollTop', contentOffset.toString());
            this.scrolling.next(contentOffset);
        }
    }

    private onDragEnd() {
        this.isDraggingThumb = false;
    }

    private fadeScrollbarAway() {
        if (this._autoHide) {
            this.activeScrollbar = false;
        }
    }

    private onScrollbarClick(e: any): void {
        if (!this.isDraggingThumb && e.target !== this.thumbRef.nativeElement) {
            const clickDirection = this.getClickDirection(e);
            if (clickDirection === Direction.Down) {
                this.scrollDown();
            }
            if (clickDirection === Direction.Up) {
                this.scrollUp();
            }
            this.updateScrollbar();
        }
    }

    private updateScrollbar(): void {
        this.showScrollbar = this.shouldShowScrollbar();
        const thumbOffset = this.calculateThumbOffset();
        const thumbHeight = this.calculateThumbHeight();
        const realOffset = this.calculateContentOffset(thumbOffset);
        this.thumbOffset = thumbOffset;
        this.thumbStyle = {
            top: `${thumbOffset}px`,
            height: `${thumbHeight}px`
        };
        this.scrolling.next(realOffset);
    }

    private shouldShowScrollbar(): boolean {
        return this.getRealContentHeight() < this.getVisibleContentHeight();
    }

    private scrollUp() {
        const realScrollTop = this.viewportRef.nativeElement.scrollTop;
        const viewHeight = this.getVisibleContentHeight();
        this.scrollTo(Math.max(0, realScrollTop - viewHeight));
    }

    private scrollDown() {
        const realScrollTop = this.viewportRef.nativeElement.scrollTop;
        const viewHeight = this.getVisibleContentHeight();
        this.scrollTo(realScrollTop + viewHeight);
    }

    private scrollTo(scrollTop: number) {
        this.renderer.setProperty(this.viewportRef.nativeElement, 'scrollTop', scrollTop.toString());
    }

    private getClickDirection(e: any) {
        const clickY = this.getClickPosition(e).y;
        const thumbOffset = this.calculateThumbOffset();
        const thumbHeight = this.calculateThumbHeight();
        if (clickY < thumbOffset) {
            return Direction.Up;
        }
        if (clickY > thumbOffset + thumbHeight) {
            return Direction.Down;
        }
    }

    private getClickPosition(e: any) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return {
            x,
            y
        };
    }

    private getVisibleContentHeight() {
        return this._height - this.padding * 2;
    }

    private getRealContentHeight() {
        return this.contentRef.nativeElement.scrollHeight;
    }

    private calculateThumbHeight(): number {
        const viewHeight = this.getVisibleContentHeight(); // height of the visible content
        const realHeight = this.getRealContentHeight();
        return (viewHeight * viewHeight) / realHeight;
    }

    private calculateThumbOffset(): number {
        const viewHeight = this.getVisibleContentHeight(); // height of the visible content
        const realHeight = this.getRealContentHeight();
        const realScrollTop = this.viewportRef.nativeElement.scrollTop;
        return (realScrollTop * viewHeight) / realHeight;
    }

    private calculateContentOffset(thumbOffset: number): number {
        const viewHeight = this.getVisibleContentHeight(); // height of the visible content
        const realHeight = this.getRealContentHeight();
        return (thumbOffset * realHeight) / viewHeight;
    }
}
