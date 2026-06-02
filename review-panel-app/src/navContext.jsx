import { createContext, useContext } from 'react';

export const NavContext = createContext(null);
export const useNav = () => useContext(NavContext);
