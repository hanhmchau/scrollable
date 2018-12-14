import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    Renderer2,
    ViewChild
} from '@angular/core';
import { fromEvent, Subject, Observable, Observer, of } from 'rxjs';
import {
    debounceTime,
    pairwise,
    skipWhile,
    startWith,
    takeUntil,
    throttleTime
} from 'rxjs/operators';
import { UnsubscriberComponent } from '../unsubscriber/unsubscriber.component';

enum Direction {
    Up = 1,
    Down = 2
}

// tslint:disable-next-line:max-classes-per-file
@Component({
    selector: 'app-scrollable',
    templateUrl: './scrollable.component.html',
    styleUrls: ['./scrollable.component.scss']
})
export class ScrollableComponent extends UnsubscriberComponent {
    @ViewChild('viewport') viewportRef: ElementRef;
    @ViewChild('content') contentRef: ElementRef;
    @ViewChild('thumb') thumbRef: ElementRef;
    @ViewChild('scrollbar') scrollbarRef: ElementRef;

    @Input() height: number = 300;
    @Input() distanceToBottom = 50;
    @Input() distanceToTop = 50;
    @Input() autoHide = true;
    @Input() padding = 25;
    @Input() thumbClass: string;
    @Input() barClass: string;
    @Input() containerClass: string;
    @Input() thumbWidth = 8;

    @Output() reachedBottom = new EventEmitter();
    @Output() reachedTop = new EventEmitter();

    private scrolling = new Subject<number>();
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
        height: `${this.height}px`,
        padding: `${this.padding}px`
    };
    private isDraggingThumb = false;
    private scrollbarOffset = 0;
    private visibleContentHeight = 0;
    private thumbHeight = 0;
    private showScrollbar = false;
    private activeScrollbar = false;

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
                this.isDraggingThumb = false;
            });

        this.addReachedEndsSubscription();
        this.addAutohideSubscription();
    }

    initializeStyles() {
        this.containerStyle = {
            height: `${this.height}px`,
            padding: `${this.padding}px`
        };
        this.scrollbarStyle = {
            width: `${this.thumbWidth + this.scrollableZone * 2}px`,
            padding: `${this.padding}px`
        };
    }

    ngAfterContentChecked(): void {
        this.updateScrollbar();
    }

    scrollToTop(): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            this.scrollTo(0);
            observer.next(null);
        });
    }

    scrollToBottom(): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            this.scrollTo(this.getRealContentHeight());
            observer.next(null);
        });
    }

    private addReachedEndsSubscription() {
        this.scrolling
            .asObservable()
            .pipe(
                takeUntil(this.onDestroyed),
                throttleTime(100),
                startWith(this.calculateThumbOffset()),
                pairwise()
            )
            .subscribe(([lastOffsetTop, currentOffsetTop]) => {
                const isScrollingUp = lastOffsetTop > currentOffsetTop;
                if (isScrollingUp && currentOffsetTop <= this.distanceToTop) {
                    this.reachedTop.emit();
                }
                if (
                    !isScrollingUp &&
                    currentOffsetTop >= this.distanceToBottom
                ) {
                    this.reachedBottom.emit();
                }
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
                this.activeScrollbar = false;
            });
    }

    private onDragStart() {
        this.isDraggingThumb = true;
        this.scrollbarOffset = this.scrollbarRef.nativeElement.getBoundingClientRect().top;
        this.visibleContentHeight = this.getVisibleContentHeight();
        this.thumbHeight = this.calculateThumbHeight();
        return false;
    }

    private onDrag(event: MouseEvent) {
        if (this.isDraggingThumb) {
            const top = Math.min(
                Math.max(
                    event.clientY - this.scrollbarOffset - this.thumbHeight,
                    0
                ),
                this.visibleContentHeight - this.thumbHeight
            );
            this.thumbStyle = {
                ...this.thumbStyle,
                top: `${top}px`
            };
            this.renderer.setProperty(
                this.viewportRef.nativeElement,
                'scrollTop',
                this.calculateContentOffset(top).toString()
            );
            this.scrolling.next(top);
        }
    }

    private onDragEnd() {
        this.isDraggingThumb = false;
    }

    private onScrollbarClick(e: any): void {
        if (!this.isDraggingThumb && e.target !== this.thumbRef.nativeElement) {
            const clickDirection = this.getClickDirection(e);
            console.log(clickDirection);
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
        this.thumbStyle = {
            top: `${thumbOffset}px`,
            height: `${thumbHeight}px`
        };
        this.scrolling.next(thumbOffset);
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
        this.renderer.setProperty(
            this.viewportRef.nativeElement,
            'scrollTop',
            scrollTop.toString()
        );
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
        return this.viewportRef.nativeElement.clientHeight;
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