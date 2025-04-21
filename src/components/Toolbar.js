import React, { useState, useEffect, useRef } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InputBase from '@mui/material/InputBase';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';

import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';

import dockerApi from '../services/dockerApi';
import { useSnackbarContext } from '../context/SnackbarContext';

const ToolbarComponent = ({ onToggleSidebar, isSidebarOpen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMouseOverResults, setIsMouseOverResults] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isPulling, setIsPulling] = useState(false);
  
  // Use our new snackbar context
  const { showSuccess, showError, showInfo } = useSnackbarContext();
  
  const searchInputRef = useRef(null);
  const searchResultsRef = useRef(null);

  // Function to search Docker Hub via our proxy
  const searchDockerHub = async (query) => {
    if (!query) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`http://localhost:5000/api/search/images?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        const formattedResults = data.results.map(item => ({
          name: item.repo_name.split('/').pop(), // Extract the name part from repo_name
          isOfficial: item.is_official,
          description: item.short_description,
          pullCount: item.pull_count,
          starCount: item.star_count,
          // Extract namespace from repo_name if it contains a slash
          namespace: item.repo_name.includes('/') ? item.repo_name.split('/')[0] : '',
          // Include full image name for pulling (use repo_name directly)
          fullName: item.repo_name,
          // Default to latest tag but can be updated later to fetch tags
          tags: ['latest'] 
        }));
        
        // Sort results to show official images first
        formattedResults.sort((a, b) => {
          if (a.isOfficial && !b.isOfficial) return -1;
          if (!a.isOfficial && b.isOfficial) return 1;
          return b.pullCount - a.pullCount;
        });
        
        setSearchResults(formattedResults);
      } else {
        console.error('Failed to search Docker Hub');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching Docker Hub:', error);
      setSearchResults([]);
      showError(`Failed to search Docker Hub: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery && searchQuery.length >= 2) {
        searchDockerHub(searchQuery);
      }
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);
    // Setup keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or / to focus search
      if ((e.ctrlKey && e.key === 'k') || (!e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
      
      // Escape to clear search and blur input
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        clearSearch();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Setup click outside listener to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close if clicking outside both the search input and search results
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target) &&
        searchResultsRef.current && 
        !searchResultsRef.current.contains(event.target)
      ) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRefresh = async () => {
    console.log('Refreshing...');
    window.location.reload();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedImage(null);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const handleCloseSearch = () => {
    setIsSearchFocused(false);
    setIsMouseOverResults(false);
  };

  const handlePullImage = async (image) => {
    if (!image) return;
    
    setIsPulling(true);
    setSelectedImage(image);
    
    try {
      const imageName = image.fullName || image.name;
      const tag = 'latest'; // Can be updated to allow tag selection
      
      // Using the new status change callback in dockerApi
      await dockerApi.pullImage(imageName, tag, ({ status, message }) => {
        if (status === 'pulling') {
          showInfo(message);
        } else if (status === 'success') {
          showSuccess(message);
        } else if (status === 'error') {
          showError(message);
        }
      });
      
      handleCloseSearch();
      // Force refresh to show the new image in the sidebar
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error pulling image:', error);
      // The error notification will be handled by the onStatusChange callback
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar variant="dense" sx={{
          bgcolor: 'primary.dark',
          height: '64px',
        }}>
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="toggle sidebar"
            onClick={onToggleSidebar}
            sx={{ mr: 2 }}
          >
            {isSidebarOpen ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" component="div" sx={{ 
            flexGrow: 1,
           }}>
            Kernel Canvas
          </Typography>
            <Box sx={{ 
            position: 'relative', 
            width: '400px', 
            display: 'flex', 
            alignItems: 'center',
            mx: 2
          }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                width: '100%', 
                position: 'relative' 
              }}>
                <Box sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  borderColor: '#e0e0e0',
                  width: '400px',
                  '&:focus-within': {
                    boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.2)',
                  },
                }}>
                  <SearchIcon color="text" sx={{ ml: 1.5 }} />                  <InputBase
                    sx={{ ml: 1, flex: 1, p: 0.7, fontSize: '0.8rem' }}
                    placeholder="Search Docker Images"
                    inputRef={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                  />
                  {searchQuery && (
                    <IconButton 
                      size="small" 
                      onClick={() => setSearchQuery('')}
                      sx={{ mr: 0.5, color: 'text' }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mr: 1.5,
                    px: 0.7,
                    py: 0.15,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    fontSize: '0.7rem',
                    color: '#e0e0e0'
                  }}>
                    Ctrl+K
                  </Box>
                </Box>
                  {/* Search Results */}
                {(isSearchFocused || isMouseOverResults) && (searchQuery.length >= 2 || isSearching) && (
                  <Box 
                    ref={searchResultsRef}
                    onMouseEnter={() => setIsMouseOverResults(true)}
                    onMouseLeave={() => setIsMouseOverResults(false)}
                    sx={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      zIndex: 2100,
                      boxShadow: 3,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mt: 0.5,
                      maxHeight: '400px',
                      overflow: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '3px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'rgba(0,0,0,0.1)',
                        borderRadius: '3px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(128,128,128,0.5)',
                        borderRadius: '3px',
                        '&:hover': {
                          background: 'rgba(128,128,128,0.7)',
                        },
                      },
                      msOverflowStyle: 'none',  /* IE and Edge */
                    }}
                  >
                    {isSearching ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <List dense>
                        {searchResults.map((image) => (
                          <React.Fragment key={image.fullName || image.name}>
                            <ListItem  
                              sx={{
                                '&:hover': {
                                  '& .image-actions': { 
                                    visibility: 'visible',
                                    opacity: 1
                                  }
                                }
                              }}
                            >                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                      <Typography variant="body2" noWrap>
                                        {image.fullName || image.repo_name}
                                      </Typography>
                                      {image.isOfficial && (
                                        <Typography 
                                          variant="caption" 
                                          sx={{ 
                                            ml: 1, 
                                            bgcolor: 'primary.main', 
                                            color: 'white', 
                                            px: 0.5, 
                                            py: 0.1,
                                            borderRadius: 0.5,
                                            fontSize: '0.65rem'
                                          }}
                                        >Official
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                }                                secondary={
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary" 
                                    noWrap 
                                    component="div"
                                    sx={{ fontSize: '0.7rem' }}
                                  >
                                    {image.description?.substring(0, 60) || 'No description'}
                                    {image.description?.length > 60 ? '...' : ''}
                                  </Typography>
                                }
                              />
                              <Box 
                                className="image-actions" 
                                sx={{ 
                                  visibility: 'hidden',
                                  opacity: 0, 
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                }}
                              >

                                <Tooltip title="Pull Image">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handlePullImage(image)}
                                    color="secondary"
                                    disabled={isPulling && selectedImage?.name === image.name}
                                  >
                                    {isPulling && selectedImage?.name === image.name ? (
                                      <CircularProgress size={18} />
                                    ) : (
                                      <CloudDownloadIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </ListItem>
                            <Divider component="li" />
                          </React.Fragment>
                        ))}
                        
                        {searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                          <ListItem>
                            <ListItemText 
                              primary="No results found" 
                              secondary="Try a different search term"
                              primaryTypographyProps={{ align: 'center' }}
                              secondaryTypographyProps={{ align: 'center' }} 
                            />
                          </ListItem>
                        )}
                      </List>
                    )}
                  </Box>
                )}
              </Box>
          </Box>
          
          <Tooltip title="Refresh">
            <IconButton color="text.primary" size="small" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
    </>
  );
};

export default ToolbarComponent;
