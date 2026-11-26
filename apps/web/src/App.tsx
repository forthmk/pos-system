import { PropsWithChildren, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from './store';
import { toggleRTL, toggleTheme, toggleLocale, toggleMenu, toggleLayout, toggleAnimation, toggleNavbar, toggleSemidark } from './store/themeConfigSlice';
import store from './store';
import { useKeepDialogsOpen } from './hooks/useKeepDialogsOpen';

function App({ children }: PropsWithChildren) {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();
    // Dialogs stay open on a backdrop click — only Cancel / ✕ / their action close them.
    useKeepDialogsOpen();

    useEffect(() => {
        dispatch(toggleTheme(themeConfig.theme));
        dispatch(toggleMenu(themeConfig.menu));
        dispatch(toggleLayout(themeConfig.layout));
        dispatch(toggleRTL(themeConfig.rtlClass));
        dispatch(toggleAnimation(themeConfig.animation));
        dispatch(toggleNavbar(themeConfig.navbar));
        dispatch(toggleLocale(themeConfig.locale));
        dispatch(toggleSemidark(themeConfig.semidark));
    }, [dispatch, themeConfig.theme, themeConfig.menu, themeConfig.layout, themeConfig.rtlClass, themeConfig.animation, themeConfig.navbar, themeConfig.locale, themeConfig.semidark]);

    return (
        <div
            className={`${(store.getState().themeConfig.sidebar && 'toggle-sidebar') || ''} ${themeConfig.menu} ${themeConfig.layout} ${
                themeConfig.rtlClass
            } main-section antialiased relative font-poppins text-sm font-normal`}
        >
            {children}
        </div>
    );
}

export default App;
