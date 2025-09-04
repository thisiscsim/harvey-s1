"use client";

import { use } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { detectArtifactType } from "@/lib/artifact-detection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPlus, Download, ArrowLeft, X, Plus, ListPlus, Settings2, Wand, Copy, SquarePen, RotateCcw, ThumbsUp, ThumbsDown, CloudUpload, FileSearch, LoaderCircle, FilePen } from "lucide-react";
import SourcesDrawer from "@/components/sources-drawer";
import ShareThreadDialog from "@/components/share-thread-dialog";
import ShareArtifactDialog from "@/components/share-artifact-dialog";
import ExportThreadDialog from "@/components/export-thread-dialog";
import ExportReviewDialog from "@/components/export-review-dialog";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import ArtifactCard from "@/components/artifact-card";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import DraftArtifactPanel from "@/components/draft-artifact-panel";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import FileManagementDialog from "@/components/file-management-dialog";
import ThinkingState from "@/components/thinking-state";
import IManageFilePickerDialog from "@/components/imanage-file-picker-dialog";

type Message = {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'artifact' | 'files';
  artifactData?: {
    title: string;
    subtitle: string;
    variant?: 'draft'; // Determines which panel to open
  };
  filesData?: Array<{
    id: string;
    name: string;
    type: 'folder' | 'file';
    modifiedDate: string;
    size?: string;
    path: string;
  }>;
  isLoading?: boolean;
  thinkingContent?: ReturnType<typeof getThinkingContent>;
  loadingState?: {
    showSummary: boolean;
    visibleBullets: number;
    showAdditionalText: boolean;
  };
  isWorkflowResponse?: boolean;
  workflowTitle?: string;
  isFirstWorkflowMessage?: boolean;
  showThinking?: boolean;
  showFileReview?: boolean;
  fileReviewContent?: {
    summary: string;
    files: Array<{
      name: string;
      type: 'pdf' | 'docx' | 'spreadsheet' | 'folder' | 'text';
    }>;
    totalFiles: number;
  };
  fileReviewLoadingState?: {
    isLoading: boolean;
    loadedFiles: number;
  };
  showDraftGeneration?: boolean;
  draftGenerationLoadingState?: {
    isLoading: boolean;
    showSummary?: boolean;
    visibleBullets?: number;
  };
};

// Shared animation configuration for consistency - refined timing
const PANEL_ANIMATION = {
  duration: 0.3,
  ease: "easeOut" as const
};

// Basic default content for the expandable thinking state per response type
function getThinkingContent(variant: 'analysis' | 'draft'): {
  summary: string;
  bullets: string[];
  additionalText?: string;
  childStates?: Array<{
    variant: 'analysis' | 'draft';
    title: string;
    summary?: string;
    bullets?: string[];
  }>;
} {
  switch (variant) {
    case 'draft':
      return {
        summary: 'Planning structure and content before drafting the document.',
        bullets: [
          'Identify audience and objective',
          'Assemble relevant facts and authorities',
          'Outline sections and key arguments'
        ]
      };

    default:
      return {
        summary: 'Analyzing the request and determining the best approach to provide a comprehensive and helpful response.',
        bullets: [],
        additionalText: ''
      };
  }
}

// In a real app, this would fetch from an API based on the chatId
const getChatTitle = (chatId: string): string => {
  const chatTitles: { [key: string]: string } = {
    'key-terms-provisions-clauses-property-us': 'Key terms, provisions and clauses to sell property in the U.S.',
    // Add more mappings as needed
  };
  
  return chatTitles[chatId] || 'Chat';
};

export default function AssistantChatPage({
  params
}: {
  params: Promise<{ chatId: string }>
}) {
  // Unwrap params using React.use()
  const { chatId } = use(params);
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('initialMessage');
  const isWorkflow = searchParams.get('isWorkflow') === 'true';
  const router = useRouter();
  
  // Sidebar control hook
  const { setOpen: setSidebarOpen } = useSidebar();
  
  // Hook to detect if viewport is above 2xl breakpoint (1536px)
  const [isAbove2xl, setIsAbove2xl] = useState(false);
  
  useEffect(() => {
    const checkBreakpoint = () => {
      setIsAbove2xl(window.innerWidth >= 1536);
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);
  
  // Use the initial message as the title if it's a new chat
  const chatTitle = getChatTitle(chatId) === 'Chat' && initialMessage ? initialMessage : getChatTitle(chatId);
  
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(401);
  const [isResizing, setIsResizing] = useState(false);
  const [isHoveringResizer, setIsHoveringResizer] = useState(false);
  const [sourcesDrawerOpen, setSourcesDrawerOpen] = useState(false);
  const [shareThreadDialogOpen, setShareThreadDialogOpen] = useState(false);
  const [shareArtifactDialogOpen, setShareArtifactDialogOpen] = useState(false);
  const [exportThreadDialogOpen, setExportThreadDialogOpen] = useState(false);
  const [exportReviewDialogOpen, setExportReviewDialogOpen] = useState(false);
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false);
  const [draftArtifactPanelOpen, setDraftArtifactPanelOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<{ title: string; subtitle: string } | null>(null);
  const [selectedDraftArtifact, setSelectedDraftArtifact] = useState<{ title: string; subtitle: string } | null>(null);
  
  // New unified artifact panel state
  const [unifiedArtifactPanelOpen, setUnifiedArtifactPanelOpen] = useState(false);
  const [currentArtifactType, setCurrentArtifactType] = useState<'draft' | null>(null);
  const [isFileManagementOpen, setIsFileManagementOpen] = useState(false);
  const [isiManagePickerOpen, setIsiManagePickerOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const hasProcessedInitialMessageRef = useRef(false);
  
  // Track if chat panel is being toggled interactively (not on mount)
  const [isChatToggling, setIsChatToggling] = useState(false);
  // Track timers for threshold hold detection
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const expandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPastCollapseThresholdRef = useRef(false);
  const isPastExpandThresholdRef = useRef(false);
  const [isPastCollapseThreshold, setIsPastCollapseThreshold] = useState(false);
  const [isPastExpandThreshold, setIsPastExpandThreshold] = useState(false);
  const [shouldTriggerCollapse, setShouldTriggerCollapse] = useState(false);
  const [shouldTriggerExpand, setShouldTriggerExpand] = useState(false);
  
  // Track if we've already auto-collapsed the sidebar for this artifact session
  const hasAutoCollapsedSidebarRef = useRef(false);
  
  // Check if any artifact panel is open
  const anyArtifactPanelOpen = artifactPanelOpen || draftArtifactPanelOpen || unifiedArtifactPanelOpen;
  
  // Check if we're coming from the assistant homepage
  const [isFromHomepage] = useState(() => {
    if (typeof window !== 'undefined') {
      const fromHomepage = sessionStorage.getItem('fromAssistantHomepage') === 'true';
      if (fromHomepage) {
        sessionStorage.removeItem('fromAssistantHomepage');
      }
      return fromHomepage;
    }
    return false;
  });
  
  // Check if this is a workflow-initiated chat
  const [isWorkflowInitiated] = useState(() => {
    if (typeof window !== 'undefined') {
      const workflowInitiated = sessionStorage.getItem('isWorkflowInitiated') === 'true';
      if (workflowInitiated) {
        sessionStorage.removeItem('isWorkflowInitiated');
      }
      return workflowInitiated;
    }
    return false;
  });

  // Track if animations have already been played to prevent replaying on chat panel toggle
  const hasPlayedAnimationsRef = useRef(false);

  // Track if source drawer has been opened once during the session
  const hasOpenedSourcesDrawerRef = useRef(false);

  // Add states for editing titles
  const [isEditingChatTitle, setIsEditingChatTitle] = useState(false);
  const [editedChatTitle, setEditedChatTitle] = useState(chatTitle);
  const [currentChatTitle, setCurrentChatTitle] = useState(chatTitle);
  const [isEditingArtifactTitle, setIsEditingArtifactTitle] = useState(false);
  const [editedArtifactTitle, setEditedArtifactTitle] = useState(selectedArtifact?.title || '');
  
  const [isEditingDraftArtifactTitle, setIsEditingDraftArtifactTitle] = useState(false);
  const [editedDraftArtifactTitle, setEditedDraftArtifactTitle] = useState(selectedDraftArtifact?.title || '');
  

  
  const chatTitleInputRef = useRef<HTMLInputElement>(null);
  const artifactTitleInputRef = useRef<HTMLInputElement>(null);
  const draftArtifactTitleInputRef = useRef<HTMLInputElement>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showBottomGradient, setShowBottomGradient] = useState(false);

  const MIN_CHAT_WIDTH = 400;
  const MAX_CHAT_WIDTH = 800;

  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Maintain scroll position when container resizes
  useEffect(() => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    let wasNearBottom = false;
    
    // Check if we're near bottom before resize
    const checkIfNearBottom = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      wasNearBottom = distanceFromBottom < 100;
    };
    
    // Initial check
    checkIfNearBottom();
    
    // Create ResizeObserver to detect when chat width changes
    const resizeObserver = new ResizeObserver(() => {
      // If we were near the bottom before resize, scroll to bottom
      if (wasNearBottom) {
        container.scrollTop = container.scrollHeight - container.clientHeight;
      }
      // Update our check for next resize
      checkIfNearBottom();
    });
    
    // Observe the container
    resizeObserver.observe(container);
    
    // Also check on scroll
    const handleScroll = () => {
      checkIfNearBottom();
    };
    
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);





  // Update edited artifact title when selected artifact changes
  useEffect(() => {
    if (selectedArtifact) {
      setEditedArtifactTitle(selectedArtifact.title);
    }
  }, [selectedArtifact]);

  // Update edited draft artifact title when selected draft artifact changes
  useEffect(() => {
    if (selectedDraftArtifact) {
      setEditedDraftArtifactTitle(selectedDraftArtifact.title);
    }
  }, [selectedDraftArtifact]);



  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        // Show top gradient when content has scrolled past the top
        setIsScrolled(scrollTop > 0);
        
        // Check if user is near the bottom (within 100px)
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        setIsNearBottom(distanceFromBottom < 100);
        
        // Show bottom gradient when not at the very bottom
        setShowBottomGradient(distanceFromBottom > 1);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    // Only auto-scroll if user is near the bottom
    if (isNearBottom && messages.length > 0) {
      // Check if the last message is an artifact - they need more time to render
      const lastMessage = messages[messages.length - 1];
      const isArtifact = lastMessage.type === 'artifact';
      
      // Use longer delay for artifact messages to ensure they're fully rendered
      const delay = isArtifact ? 500 : 100;
      
      let timeoutId: NodeJS.Timeout;
      
      // For artifact messages, use requestAnimationFrame to ensure DOM is ready
      if (isArtifact) {
        // Double RAF to ensure React has committed to DOM
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            timeoutId = setTimeout(() => {
              scrollToBottom();
            }, delay);
          });
        });
      } else {
        timeoutId = setTimeout(() => {
          scrollToBottom();
        }, delay);
      }

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [messages, isNearBottom, scrollToBottom]);

  // Handle saving chat title
  const handleSaveChatTitle = useCallback(() => {
    if (editedChatTitle.trim()) {
      if (editedChatTitle !== currentChatTitle) {
        setCurrentChatTitle(editedChatTitle);
        toast.success("Chat title updated");
      }
    } else {
      setEditedChatTitle(currentChatTitle);
    }
    setIsEditingChatTitle(false);
  }, [editedChatTitle, currentChatTitle]);

  // Handle saving artifact title
  const handleSaveArtifactTitle = useCallback(() => {
    if (editedArtifactTitle.trim() && selectedArtifact) {
      if (editedArtifactTitle !== selectedArtifact.title) {
        // Update the selected artifact
        setSelectedArtifact({
          ...selectedArtifact,
          title: editedArtifactTitle
        });
        
        // Also update the title in the messages array
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg.type === 'artifact' && msg.artifactData?.title === selectedArtifact.title) {
              return {
                ...msg,
                artifactData: {
                  ...msg.artifactData,
                  title: editedArtifactTitle
                }
              };
            }
            return msg;
          })
        );
        
        toast.success("Artifact title updated");
      }
    } else if (selectedArtifact) {
      setEditedArtifactTitle(selectedArtifact.title);
    }
    setIsEditingArtifactTitle(false);
  }, [editedArtifactTitle, selectedArtifact]);

  // Handle saving draft artifact title
  const handleSaveDraftArtifactTitle = useCallback(() => {
    if (editedDraftArtifactTitle.trim() && selectedDraftArtifact) {
      if (editedDraftArtifactTitle !== selectedDraftArtifact.title) {
        // Update the selected draft artifact
        setSelectedDraftArtifact({
          ...selectedDraftArtifact,
          title: editedDraftArtifactTitle
        });
        
        // Also update the title in the messages array
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg.type === 'artifact' && msg.artifactData?.title === selectedDraftArtifact.title) {
              return {
                ...msg,
                artifactData: {
                  ...msg.artifactData,
                  title: editedDraftArtifactTitle
                }
              };
            }
            return msg;
          })
        );
        
        toast.success("Draft artifact title updated");
      }
    } else if (selectedDraftArtifact) {
      setEditedDraftArtifactTitle(selectedDraftArtifact.title);
    }
    setIsEditingDraftArtifactTitle(false);
  }, [editedDraftArtifactTitle, selectedDraftArtifact]);



  // Handle clicking outside of input fields
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatTitleInputRef.current && !chatTitleInputRef.current.contains(event.target as Node)) {
        handleSaveChatTitle();
      }
      if (artifactTitleInputRef.current && !artifactTitleInputRef.current.contains(event.target as Node)) {
        handleSaveArtifactTitle();
      }
      if (draftArtifactTitleInputRef.current && !draftArtifactTitleInputRef.current.contains(event.target as Node)) {
        handleSaveDraftArtifactTitle();
      }

    };

    if (isEditingChatTitle || isEditingArtifactTitle || isEditingDraftArtifactTitle) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isEditingChatTitle, isEditingArtifactTitle, isEditingDraftArtifactTitle, editedChatTitle, editedArtifactTitle, editedDraftArtifactTitle, handleSaveChatTitle, handleSaveArtifactTitle, handleSaveDraftArtifactTitle]);

  // Auto-collapse sidebar when artifact panel opens
  // Note: This is a one-time auto-collapse for space optimization.
  // Users can still manually expand the sidebar afterward using the avatar button,
  // sidebar rail, or keyboard shortcut (Cmd/Ctrl + B).
  useEffect(() => {
    if (anyArtifactPanelOpen && !hasAutoCollapsedSidebarRef.current) {
      setSidebarOpen(false);
      hasAutoCollapsedSidebarRef.current = true;
    } else if (!anyArtifactPanelOpen) {
      // Reset the flag when artifact panel closes
      hasAutoCollapsedSidebarRef.current = false;
    }
  }, [anyArtifactPanelOpen, setSidebarOpen]);

  const toggleChat = useCallback((open: boolean) => {
    setIsChatToggling(true);
    setChatOpen(open);
  }, []);

  // Reset chat toggling flag when chat closes
  useEffect(() => {
    if (!chatOpen && isChatToggling) {
      setIsChatToggling(false);
    }
  }, [chatOpen, isChatToggling]);

  // Handle collapse trigger
  useEffect(() => {
    if (shouldTriggerCollapse) {
      setIsResizing(false); // Stop resizing before triggering animation
      // Use requestAnimationFrame to ensure state update is processed
      requestAnimationFrame(() => {
        toggleChat(false);
        setShouldTriggerCollapse(false);
      });
    }
  }, [shouldTriggerCollapse, toggleChat]);

  // Handle expand trigger
  useEffect(() => {
    if (shouldTriggerExpand) {
      setIsResizing(false); // Stop resizing before closing artifacts
      // Use requestAnimationFrame to ensure state update is processed
      requestAnimationFrame(() => {
        setArtifactPanelOpen(false);
        setDraftArtifactPanelOpen(false);
        setUnifiedArtifactPanelOpen(false);
        setSelectedArtifact(null);
        setSelectedDraftArtifact(null);
        setCurrentArtifactType(null);
        setShouldTriggerExpand(false);
      });
    }
  }, [shouldTriggerExpand]);

  // Function to handle workflow-initiated messages (AI-only response)
  const sendWorkflowMessage = useCallback((workflowTitle: string) => {
    setIsLoading(true);
    
    // Create assistant message without thinking states for first workflow message
    const assistantMessage = {
      role: 'assistant' as const,
      content: '', // Will be populated shortly
      type: 'text' as const, // Text type for workflow responses
      isLoading: true,
      isWorkflowResponse: true, // Flag to identify workflow responses
      workflowTitle: workflowTitle,
      isFirstWorkflowMessage: true, // Flag to identify this is the first message
      showThinking: false // Explicitly disable thinking state for first message
    };
    
    // Add only the assistant message (no user message for workflow)
    setMessages([assistantMessage]);
    
    // Scroll to bottom after message is added
    setTimeout(() => scrollToBottom(), 50);
    
    // Show the content quickly without thinking states
    setTimeout(() => {
      // Update the assistant message with actual content for S-1 workflow
      setMessages(prev => prev.map((msg, idx) => {
        if (idx === 0 && msg.role === 'assistant' && msg.isLoading) {
          let content = '';
          
          if (workflowTitle.toLowerCase().includes('s-1')) {
            content = "Let's get going on drafting your S-1. Before we get started, I'll need some supporting materials (charters, financials, press releases, prior filings). I'll also need key deal details like offering type, structure, and use of proceeds. After I have all the information, I can generate a draft S-1 shell that you can edit in draft mode. First things first, how would you like to upload your supporting documents?";
          } else {
            content = `I'll help you with "${workflowTitle}". What specific information or documents would you like me to work with?`;
          }
          
          return {
            ...msg,
            content,
            isLoading: false
          };
        }
        return msg;
      }));
      
      setIsLoading(false);
      scrollToBottom();
    }, 300); // Much shorter delay since no thinking states
  }, [scrollToBottom]);

  const sendMessage = useCallback((messageOverride?: string) => {
    const messageToSend = messageOverride || inputValue;
    if (messageToSend.trim() && !isLoading) {
      const userMessage = messageToSend;
      setInputValue('');
      setIsLoading(true);
      
      // Reset textarea height
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = '60px'; // Reset to minHeight
      }
      
      // Determine artifact type using weighted keyword scoring
      const artifactType = detectArtifactType(userMessage);
      const isDraftArtifact = artifactType === 'draft';
      
      // Open sources drawer only on the first message if not already opened
      if (!sourcesDrawerOpen && !hasOpenedSourcesDrawerRef.current) {
        setTimeout(() => {
          setSourcesDrawerOpen(true);
          hasOpenedSourcesDrawerRef.current = true;
        }, 1000); // Open drawer during AI thinking time
      }
      
      // Get the thinking content for the appropriate variant
      const variant = isDraftArtifact ? 'draft' : 'analysis';
      const thinkingContent = getThinkingContent(variant);
      
      // Initialize progressive loading states - show content piece by piece
      const loadingState = {
        showSummary: false,
        visibleBullets: 0,
        showAdditionalText: false
      };
      
      // Create assistant message with loading thinking states
      const assistantMessage = {
        role: 'assistant' as const,
        content: '', // Empty initially, will be populated after thinking
        type: isDraftArtifact ? 'artifact' as const : 'text' as const,
        thinkingContent,
        loadingState,
        isLoading: true,
        ...(isDraftArtifact ? {
          artifactData: {
            title: isDraftArtifact ? 'Record of Deliberation' : 'Extraction of Agreements and Provisions',
            subtitle: isDraftArtifact ? 'Version 1' : '24 columns · 104 rows',
            variant: 'draft' as const
          }
        } : {})
      };
      
      // Add both user and assistant messages in a single update
      setMessages(prev => [
        ...prev, 
        { role: 'user' as const, content: userMessage, type: 'text' as const },
        assistantMessage
      ]);
      
      // Scroll to bottom after messages are added
      setTimeout(() => scrollToBottom(), 50);
      
      // Progressively reveal thinking content with smoother timing
      // Show summary after 600ms (to sync with animation)
      setTimeout(() => {
        setMessages(prev => prev.map((msg, idx) => 
          idx === prev.length - 1 && msg.role === 'assistant' && msg.isLoading && msg.loadingState
            ? { ...msg, loadingState: { ...msg.loadingState, showSummary: true } }
            : msg
        ));
      }, 600);
      
      // Show bullets one by one with better timing for animations
      const bullets = thinkingContent.bullets || [];
      bullets.forEach((_, bulletIdx) => {
        setTimeout(() => {
          setMessages(prev => prev.map((msg, idx) => 
            idx === prev.length - 1 && msg.role === 'assistant' && msg.isLoading && msg.loadingState
              ? { ...msg, loadingState: { ...msg.loadingState, visibleBullets: bulletIdx + 1 } }
              : msg
          ));
          scrollToBottom();
        }, 1200 + (bulletIdx * 400)); // Start at 1.2s, then 400ms between each bullet for smoother reveal
      });
      
      // Show additional text if exists
      if (thinkingContent.additionalText) {
        setTimeout(() => {
          setMessages(prev => prev.map((msg, idx) => 
            idx === prev.length - 1 && msg.role === 'assistant' && msg.isLoading && msg.loadingState
              ? { ...msg, loadingState: { ...msg.loadingState, showAdditionalText: true } }
              : msg
          ));
          scrollToBottom();
        }, 1200 + (bullets.length * 400) + 300);
      }
      
      // Simulate AI response after thinking states complete
      setTimeout(() => {
        // Update the assistant message with actual content and remove loading state
        setMessages(prev => prev.map((msg, idx) => {
          if (idx === prev.length - 1 && msg.role === 'assistant' && msg.isLoading) {
            return {
              ...msg,
              content: isDraftArtifact 
                ? 'I have drafted a memo for you. Please let me know if you would like to continue editing the draft or if you need any specific changes or additional information included.'
                : 'legal-analysis',
              isLoading: false,
              loadingStates: undefined // Clear loading states after content appears
            };
          }
          return msg;
        }));
        
        setIsLoading(false);
        scrollToBottom();
      }, 4000); // Adjusted to 4 seconds to account for smoother animation timing
    }
  }, [inputValue, isLoading, sourcesDrawerOpen, hasOpenedSourcesDrawerRef, scrollToBottom]);
  
  // Process initial message when component mounts
  useEffect(() => {
    if (initialMessage && !hasProcessedInitialMessageRef.current) {
      hasProcessedInitialMessageRef.current = true;
      
      // Check if this is a workflow-initiated chat
      if (isWorkflow || isWorkflowInitiated) {
        // For workflows, send AI message directly
        setTimeout(() => {
          sendWorkflowMessage(initialMessage);
        }, 100);
      } else {
        // For regular chats, send as user message
        setInputValue(initialMessage);
        setTimeout(() => {
          sendMessage(initialMessage);
        }, 100);
      }
    }
  }, [initialMessage, sendMessage, sendWorkflowMessage, isWorkflow, isWorkflowInitiated]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow resizing if any artifact panel is open
    if (!anyArtifactPanelOpen) return;
    e.preventDefault();

    setIsResizing(true);
    // Reset threshold states when starting a new resize
    isPastCollapseThresholdRef.current = false;
    isPastExpandThresholdRef.current = false;
    setIsPastCollapseThreshold(false);
    setIsPastExpandThreshold(false);
  };

  useEffect(() => {

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        let newWidth = e.clientX - containerRect.left;

        
        // Handle collapse threshold (dragging below minimum width)
        if (newWidth < MIN_CHAT_WIDTH - 50 && chatOpen) {

          if (!isPastCollapseThresholdRef.current) {

            isPastCollapseThresholdRef.current = true;
            setIsPastCollapseThreshold(true);
            // Start timer for collapse
            collapseTimerRef.current = setTimeout(() => {

              isPastCollapseThresholdRef.current = false;
              setIsPastCollapseThreshold(false);
              setShouldTriggerCollapse(true);
            }, 250); // Quarter second hold time
          }
        } else {
          // User moved back above threshold, cancel collapse
          if (isPastCollapseThresholdRef.current) {

            isPastCollapseThresholdRef.current = false;
            setIsPastCollapseThreshold(false);
            if (collapseTimerRef.current) {
              clearTimeout(collapseTimerRef.current);
              collapseTimerRef.current = null;
            }
          }
        }
        
        // Handle expand threshold (dragging above maximum width to collapse artifacts)
        if (newWidth > MAX_CHAT_WIDTH + 50 && chatOpen && anyArtifactPanelOpen) {

          if (!isPastExpandThresholdRef.current) {

            isPastExpandThresholdRef.current = true;
            setIsPastExpandThreshold(true);
            // Start timer for artifact collapse
            expandTimerRef.current = setTimeout(() => {

              isPastExpandThresholdRef.current = false;
              setIsPastExpandThreshold(false);
              setShouldTriggerExpand(true);
            }, 250); // Quarter second hold time
          }
        } else {
          // User moved back below threshold, cancel artifact collapse
          if (isPastExpandThresholdRef.current) {

            isPastExpandThresholdRef.current = false;
            setIsPastExpandThreshold(false);
            if (expandTimerRef.current) {
              clearTimeout(expandTimerRef.current);
              expandTimerRef.current = null;
            }
          }
        }
        
        // Only update width if chat is open and not past collapse threshold
        if (chatOpen && !isPastCollapseThreshold) {
          // Enforce min/max constraints
          newWidth = Math.max(MIN_CHAT_WIDTH, Math.min(newWidth, MAX_CHAT_WIDTH));
          setChatWidth(newWidth + 1); // +1 to account for the border
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      isPastCollapseThresholdRef.current = false;
      isPastExpandThresholdRef.current = false;
      setIsPastCollapseThreshold(false);
      setIsPastExpandThreshold(false);
      setShouldTriggerCollapse(false);
      setShouldTriggerExpand(false);
      
      // Clear any pending timers
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }
    };

    if (isResizing) {

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Add class to body to maintain cursor during drag
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Clean up timers and refs
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current);
        expandTimerRef.current = null;
      }
      isPastCollapseThresholdRef.current = false;
      isPastExpandThresholdRef.current = false;
    };
  }, [isResizing, chatOpen, artifactPanelOpen, draftArtifactPanelOpen, anyArtifactPanelOpen, isPastCollapseThreshold, isPastExpandThreshold]);

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Main Content */}
      <SidebarInset>
        <div ref={containerRef} className="h-screen flex text-sm" style={{ fontSize: '14px', lineHeight: '20px' }}>
          {/* AI Chat Interface - Left Panel */}
          <AnimatePresence mode="wait">
            {chatOpen && (
              <motion.div 
                key="chat-panel"
                initial={isChatToggling ? { width: 0, opacity: 0 } : false}
                animate={isResizing ? undefined : { 
                  width: anyArtifactPanelOpen ? chatWidth : (sourcesDrawerOpen ? 'calc(100% - 400px)' : '100%'),
                  opacity: 1
                }}
                exit={{ width: 0, opacity: 0 }}
                transition={{
                  width: PANEL_ANIMATION,
                  opacity: { duration: 0.15, ease: "easeOut" }
                }}
                onAnimationComplete={() => {
                  if (isChatToggling) {
                    setIsChatToggling(false);
                  }
                }}
                className="flex relative overflow-hidden bg-white"
                style={{ 
                  flexShrink: 0,
                  ...(isResizing && anyArtifactPanelOpen ? { width: chatWidth } : {})
                }}
              >
        <div className="flex flex-col bg-white relative" style={{ 
          width: anyArtifactPanelOpen ? chatWidth - 1 : '100%',
          minWidth: 0
        }}>

          {/* Header */}
          <motion.div 
            className="px-3 py-4 border-b border-neutral-200 flex items-center justify-between" 
            style={{ height: '52px' }}
            initial={initialMessage && isFromHomepage && !hasPlayedAnimationsRef.current ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            transition={initialMessage && isFromHomepage && !hasPlayedAnimationsRef.current ? { delay: 0.5, duration: 0.5 } : {}}
          >
            {/* Back Button, Separator, and Editable Chat Title */}
            <div className="flex items-center flex-1 min-w-0">
              {/* Back Button */}
              <button
                onClick={() => router.push('/assistant')}
                className="p-2 hover:bg-neutral-100 rounded-md transition-colors mr-1"
              >
                <ArrowLeft size={16} className="text-neutral-600" />
              </button>
              
              {/* Vertical Separator */}
              <div className="w-px bg-neutral-200 mr-3" style={{ height: '20px' }}></div>
              
              {/* Editable Chat Title */}
              {isEditingChatTitle ? (
                <input
                  ref={chatTitleInputRef}
                  type="text"
                  value={editedChatTitle}
                  onChange={(e) => setEditedChatTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveChatTitle();
                    }
                  }}
                  onFocus={(e) => {
                    // Move cursor to start and scroll to beginning
                    setTimeout(() => {
                      e.target.setSelectionRange(0, 0);
                      e.target.scrollLeft = 0;
                    }, 0);
                  }}
                  className="text-neutral-900 font-medium bg-neutral-200 border border-neutral-400 outline-none px-2 py-1.5 -ml-2 rounded-md mr-4 text-sm"
                  style={{ 
                    width: `${Math.min(Math.max(editedChatTitle.length * 8 + 40, 120), 600)}px`,
                    height: '32px'
                  }}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => {
                    setIsEditingChatTitle(true);
                    setEditedChatTitle(currentChatTitle);
                  }}
                  className="text-neutral-900 font-medium truncate mr-4 px-2 py-1.5 -ml-2 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer text-left text-sm"
                  style={{ minWidth: 0, height: '32px' }}
                >
                  {currentChatTitle}
                </button>
              )}
            </div>
            
            {/* Conditional buttons based on artifact panel state */}
            {!artifactPanelOpen && !draftArtifactPanelOpen ? (
              // When artifact panel is collapsed, show full secondary buttons
              <div className="flex gap-2 items-center">
                <Button 
                  variant="secondary"
                  onClick={() => setShareThreadDialogOpen(true)}
                  className="gap-2"
                  style={{ height: '32px' }}
                >
                  <UserPlus size={16} />
                  <span>Share</span>
                </Button>
                <Button 
                  variant="secondary"
                  className="gap-2"
                  style={{ height: '32px' }}
                  onClick={() => setExportThreadDialogOpen(true)}
                >
                  <Download size={16} />
                  <span>Export</span>
                </Button>
              </div>
            ) : (
              // When artifact panel is expanded, show dropdown menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-neutral-100 rounded-md transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
                      <circle cx="5" cy="12" r="1"/>
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="19" cy="12" r="1"/>
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setShareThreadDialogOpen(true)}>
                    <UserPlus size={16} className="mr-2" />
                    <span>Share</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExportThreadDialogOpen(true)}>
                    <Download size={16} className="mr-2" />
                    <span>Export</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </motion.div>
          
          {/* Messages Area Container */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {/* Top Gradient Overlay - positioned outside scrollable area */}
            <div 
              className={`absolute top-0 left-0 right-0 pointer-events-none z-10 transition-opacity duration-300 chat-scroll-gradient ${
                isScrolled ? 'opacity-100' : 'opacity-0'
              }`}
            />
            
            {/* Bottom Gradient Overlay */}
            <div 
              className={`absolute bottom-0 left-0 right-0 pointer-events-none z-10 transition-opacity duration-300 chat-scroll-gradient-bottom ${
                showBottomGradient ? 'opacity-100' : 'opacity-0'
              }`}
            />
            
            {/* Messages Area */}
            <motion.div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-8 pb-8 hide-scrollbar"
              initial={initialMessage && isFromHomepage && !hasPlayedAnimationsRef.current ? { opacity: 0 } : {}}
              animate={{ opacity: 1 }}
              transition={initialMessage && isFromHomepage && !hasPlayedAnimationsRef.current ? { delay: 0.4, duration: 0.6 } : {}}
            >
              <div className="mx-auto" style={{ maxWidth: '740px' }}>

            {messages.length === 0 ? (
              <div className="text-center text-neutral-500 mt-8">
                <p>Start a conversation with Harvey</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} data-message className={`flex items-start space-x-1 ${index !== messages.length - 1 ? 'mb-6' : ''}`}>
                  {/* Avatar/Icon */}
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <div className="w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <Image src="/harvey-avatar.svg" alt="Harvey" width={24} height={24} className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    {message.role === 'assistant' && (
                      <>

                        {/* Show loading thinking states OR regular thinking state - unless explicitly disabled */}
                        {message.showThinking !== false && (
                          <>
                            {message.isLoading && message.thinkingContent && message.loadingState ? (
                              // Loading thinking states - progressively reveal content
                              <ThinkingState
                                variant={message.type === 'artifact' ? 'draft' : 'analysis'}
                                title="Thinking..."
                                durationSeconds={undefined}
                                summary={message.loadingState.showSummary ? message.thinkingContent.summary : undefined}
                                bullets={message.thinkingContent.bullets?.slice(0, message.loadingState.visibleBullets)}
                                additionalText={message.loadingState.showAdditionalText ? message.thinkingContent.additionalText : undefined}
                                childStates={undefined} // Always single-step
                                isLoading={true} // This will keep it expanded and show shimmer
                              />
                            ) : message.thinkingContent ? (
                              // Regular thinking state (after loading) - use the stored thinking content
                              <ThinkingState
                                variant={message.type === 'artifact' ? 'draft' : 'analysis'}
                                title="Thought"
                                durationSeconds={6}
                                summary={message.thinkingContent.summary}
                                bullets={message.thinkingContent.bullets}
                                additionalText={message.thinkingContent.additionalText}
                                childStates={undefined} // Always single-step
                                defaultOpen={false} // Will be collapsed after loading
                              />
                            ) : (
                              // Fallback to default thinking content if none stored
                              <ThinkingState
                                variant={message.type === 'artifact' ? 'draft' : 'analysis'}
                                title="Thought"
                                durationSeconds={6}
                                summary={getThinkingContent(message.type === 'artifact' ? 'draft' : 'analysis').summary}
                                bullets={getThinkingContent(message.type === 'artifact' ? 'draft' : 'analysis').bullets}
                                additionalText={getThinkingContent(message.type === 'artifact' ? 'draft' : 'analysis').additionalText}
                                childStates={undefined} // Always single-step
                                defaultOpen={false} // Will be collapsed after loading
                              />
                            )}
                          </>
                        )}
                        
                        {/* Show content only if not loading */}
                        {!message.isLoading && message.content && (
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                              {message.type === 'artifact' ? (
                      <div className="space-y-3">
                        <div className="text-neutral-900 leading-relaxed pl-2">
                          {message.content}
                        </div>
                        <div className="pl-2">
                          <ArtifactCard
                            key={`artifact-${message.artifactData?.title}-${unifiedArtifactPanelOpen}`}
                            title={message.artifactData?.title || 'Artifact'}
                            subtitle={message.artifactData?.subtitle || ''}
                            variant={unifiedArtifactPanelOpen ? 'small' : 'large'}
                            isSelected={unifiedArtifactPanelOpen && (
                              currentArtifactType === 'draft' && message.artifactData?.variant === 'draft' && selectedDraftArtifact?.title === message.artifactData?.title
                            )}
                            showSources={true}
                            onClick={() => {
                            // Immediately update the artifact content
                            const artifactType = 'draft';
                            const artifactData = {
                              title: message.artifactData?.title || 'Artifact',
                              subtitle: message.artifactData?.subtitle || ''
                            };
                            
                            // Update unified panel state
                            setCurrentArtifactType(artifactType);
                            setUnifiedArtifactPanelOpen(true);
                            
                            // Also update the legacy states for backward compatibility
                            setSelectedDraftArtifact(artifactData);
                            setDraftArtifactPanelOpen(true);
                          }}
                          />
                        </div>
                        {/* Ghost buttons for AI messages with artifacts */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center">
                              <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                                <Copy className="w-3 h-3" />
                                Copy
                              </button>
                              <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                                <Download className="w-3 h-3" />
                                Export
                              </button>
                              <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                                <RotateCcw className="w-3 h-3" />
                                Rewrite
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button className="text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm p-1.5">
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button className="text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm p-1.5">
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-neutral-900 leading-relaxed pl-2">
                          {message.content === 'legal-analysis' ? (
                            <div className="space-y-4">
                              <p>The entitlement of a commercial tenant to self-help rights depends on the jurisdiction and the specific circumstances of the case. Below is an analysis based on federal principles, state laws, and relevant case law:</p>
                              
                              <h3 className="text-base font-semibold">Federal and General Principles</h3>
                              <p>Under federal law and general principles, there is no inherent right for a commercial tenant to engage in self-help. Instead, the remedies available to tenants are typically governed by statutory frameworks or common law principles, which vary by jurisdiction. For example, in the District of Columbia, the common law right of self-help for landlords has been abrogated, and statutory remedies are deemed exclusive. This principle applies equally to commercial tenancies, as established in Mendes v. Johnson, 389 A.2d 781 (D.C. 1978), where the court held that a tenant has the right not to have their possession interfered with except by lawful process.</p>
                              
                              <h3 className="text-base font-semibold">Jurisdictional Analysis</h3>
                              
                              <h4 className="text-sm font-semibold mt-2">New York</h4>
                              <p>In New York, the focus is primarily on the landlord&apos;s right to self-help rather than the tenant&apos;s. Case law such as Sol De Ibiza, LLC v. Panjo Realty, Inc., 911 N.Y.S.2d 567 (App. Term 2010) and Martinez v. Ulloa, 22 N.Y.S.3d 787 (N.Y. App. Term. 2015) confirms that landlords may utilize self-help to regain possession of commercial premises under specific conditions, including a lease provision reserving the right, a valid rent demand, and peaceable reentry. However, there is no indication in these cases that commercial tenants have a reciprocal right to self-help. Instead, tenants typically seek judicial remedies, such as restoration of possession or damages for wrongful eviction under RPAPL § 853.</p>
                              
                              <h4 className="text-sm font-semibold mt-2">District of Columbia</h4>
                              <p>In the District of Columbia, the courts have explicitly rejected the use of self-help by landlords and tenants alike. In Mendes v. Johnson and Sarete, Inc. v. 1344 U St. Ltd. P&apos;ship, 871 A.2d 480 (D.C. 2005), the courts held that statutory remedies for reacquiring possession are exclusive, and any interference with possession outside of lawful process constitutes wrongful eviction. This prohibition applies to both residential and commercial tenancies.</p>
                              
                              <h4 className="text-sm font-semibold mt-2">Rhode Island</h4>
                              <p>Rhode Island law explicitly prohibits the use of self-help by landlords to reenter and repossess leased premises, whether under common law or contractual agreements. While the statute, R.I. Gen. Laws § 34-18.1-15, does not directly address tenants, the prohibition on self-help for landlords suggests a strong preference for judicial processes to resolve possession disputes.</p>
                              
                              <h4 className="text-sm font-semibold mt-2">Virginia</h4>
                              <p>Virginia law permits self-help eviction by landlords in commercial tenancies, provided it does not incite a breach of the peace, as outlined in Va. Code Ann. § 55.1-1400. However, the statute does not extend this right to tenants, and tenants are generally expected to rely on judicial remedies to address disputes.</p>
                              
                              <h3 className="text-base font-semibold">Conclusion</h3>
                              <p>In most jurisdictions, commercial tenants are not entitled to self-help rights. Instead, they are expected to seek judicial remedies to address disputes with landlords. Jurisdictions like the District of Columbia and Rhode Island explicitly prohibit self-help, while others, such as New York and Virginia, focus on the landlord&apos;s rights without extending similar rights to tenants. Tenants should carefully review their lease agreements and applicable state laws to determine their rights and remedies in possession disputes.</p>
                            </div>
                          ) : (
                            message.content
                          )}
                        </div>
                        
                        {/* File Review Thinking State */}
                        {message.showFileReview && message.fileReviewContent && (
                          <AnimatePresence>
                            <motion.div 
                              className="mt-3"
                              
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                              <ThinkingState
                                variant="analysis"
                                title={message.fileReviewLoadingState?.isLoading ? "Reviewing files..." : "Reviewed all files"}
                                durationSeconds={undefined}
                                icon={FileSearch}
                                summary={message.fileReviewContent.summary}
                                customContent={
                                <motion.div 
                                  className="mt-3"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3, ease: "easeOut" }}
                                >
                                  <div className="flex flex-wrap gap-2">
                                    {message.fileReviewContent.files.map((file, idx) => (
                                      <motion.div
                                        key={`file-chip-${idx}`}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ 
                                          duration: 0.2, 
                                          ease: "easeOut",
                                          delay: Math.floor(idx / 3) * 0.1 // Animate by rows (assuming ~3 chips per row)
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2 py-1.5 border border-neutral-200 rounded-md text-xs"
                                      >
                                        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                                          {message.fileReviewLoadingState?.isLoading && idx >= (message.fileReviewLoadingState?.loadedFiles || 0) ? (
                                            <LoaderCircle className="w-4 h-4 animate-spin text-neutral-600" />
                                          ) : file.type === 'pdf' ? (
                                            <Image src="/pdf-icon.svg" alt="PDF" width={16} height={16} />
                                          ) : file.type === 'docx' ? (
                                            <Image src="/docx-icon.svg" alt="DOCX" width={16} height={16} />
                                          ) : file.type === 'spreadsheet' ? (
                                            <Image src="/xlsx-icon.svg" alt="Spreadsheet" width={16} height={16} />
                                          ) : file.type === 'folder' ? (
                                            <Image src="/folderIcon.svg" alt="Folder" width={16} height={16} />
                                          ) : (
                                            <Image src="/file.svg" alt="File" width={16} height={16} />
                                          )}
                                        </div>
                                        <span className="text-neutral-700 truncate max-w-[200px]">{file.name}</span>
                                      </motion.div>
                                    ))}
                                    {message.fileReviewContent.totalFiles > message.fileReviewContent.files.length && (
                                      <motion.button 
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ 
                                          duration: 0.2, 
                                          ease: "easeOut",
                                          delay: Math.floor(message.fileReviewContent.files.length / 3) * 0.1
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs text-neutral-600 hover:text-neutral-800 transition-colors"
                                      >
                                        View all
                                      </motion.button>
                                    )}
                                  </div>
                                </motion.div>
                              }
                              defaultOpen={false}
                              isLoading={message.fileReviewLoadingState?.isLoading}
                            />
                          </motion.div>
                        </AnimatePresence>
                        )}
                        
                        {/* File review completion message */}
                        {message.fileReviewLoadingState && !message.fileReviewLoadingState.isLoading && message.showFileReview && (
                          <AnimatePresence>
                            <motion.div 
                              className="mt-1 text-neutral-900 leading-relaxed pl-2"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                              Perfect, I&apos;ve reviewed all the files that you&apos;ve provided. I&apos;ve managed to already identify key information that will be essential for drafting your S-1 registration statement, including business operations, financial data, risk factors, and material agreements. I&apos;ll help you generate a draft of the S-1 shell.
                            </motion.div>
                          </AnimatePresence>
                        )}
                        
                        {/* Draft Generation Thinking State */}
                        {message.showDraftGeneration && (
                          <AnimatePresence>
                            <motion.div 
                              className="mt-3.5"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            >
                              <ThinkingState
                                variant="draft"
                                title={message.draftGenerationLoadingState?.isLoading ? "Generating draft..." : "Generated draft"}
                                durationSeconds={undefined}
                                summary={message.draftGenerationLoadingState?.showSummary || !message.draftGenerationLoadingState?.isLoading ? getThinkingContent('draft').summary : undefined}
                                bullets={message.draftGenerationLoadingState?.isLoading 
                                  ? getThinkingContent('draft').bullets?.slice(0, message.draftGenerationLoadingState?.visibleBullets || 0)
                                  : getThinkingContent('draft').bullets
                                }
                                defaultOpen={false}
                                isLoading={message.draftGenerationLoadingState?.isLoading}
                                icon={FilePen}
                              />
                              
                              {/* Draft Artifact Card - show after generation completes */}
                              {!message.draftGenerationLoadingState?.isLoading && message.artifactData && (
                                <motion.div 
                                  className="mt-2.5 pl-2"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
                                >
                                  <ArtifactCard
                                    key={`artifact-${message.artifactData.title}-${unifiedArtifactPanelOpen}`}
                                    title={message.artifactData.title}
                                    subtitle={message.artifactData.subtitle}
                                    variant={unifiedArtifactPanelOpen ? 'small' : 'large'}
                                    isSelected={unifiedArtifactPanelOpen && (
                                      currentArtifactType === 'draft' && message.artifactData?.variant === 'draft' && selectedDraftArtifact?.title === message.artifactData?.title
                                    )}
                                    showSources={true}
                                    onClick={() => {
                                      const artifactType = 'draft';
                                      const artifactData = {
                                        title: message.artifactData?.title || 'Artifact',
                                        subtitle: message.artifactData?.subtitle || ''
                                      };
                                      
                                      setCurrentArtifactType(artifactType);
                                      setUnifiedArtifactPanelOpen(true);
                                      setSelectedDraftArtifact(artifactData);
                                      setDraftArtifactPanelOpen(true);
                                    }}
                                  />
                                </motion.div>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        )}
                        
                        {/* Workflow shortcut buttons */}
                        {message.isWorkflowResponse && message.workflowTitle?.toLowerCase().includes('s-1') && !messages.some(msg => msg.type === 'files') && (
                              <div className="pl-2 mt-4">
                                <div className="flex flex-wrap gap-2">
                              <button 
                                className="py-1.5 px-3 bg-white border border-neutral-200 rounded-md hover:border-neutral-300 transition-colors flex items-center gap-1.5"
                                onClick={() => setIsFileManagementOpen(true)}
                              >
                                <CloudUpload size={16} className="text-neutral-600" />
                                <span className="text-neutral-900 text-sm font-medium">Upload files</span>
                              </button>
                              
                              <button 
                                className="py-1.5 px-3 bg-white border border-neutral-200 rounded-md hover:border-neutral-300 transition-colors flex items-center gap-1.5"
                                onClick={() => setIsiManagePickerOpen(true)}
                              >
                                <Image src="/imanage.svg" alt="" width={16} height={16} />
                                <span className="text-neutral-900 text-sm font-medium">Add from iManage</span>
                              </button>
                              
                              <button className="py-1.5 px-3 bg-white border border-neutral-200 rounded-md hover:border-neutral-300 transition-colors flex items-center gap-1.5">
                                <Image src="/sharepoint.svg" alt="" width={16} height={16} />
                                <span className="text-neutral-900 text-sm font-medium">Add from SharePoint</span>
                              </button>
                              
                              <button className="py-1.5 px-3 bg-white border border-neutral-200 rounded-md hover:border-neutral-300 transition-colors flex items-center gap-1.5">
                                <Image src="/google-drive.svg" alt="" width={16} height={16} />
                                <span className="text-neutral-900 text-sm font-medium">Add from Google Drive</span>
                              </button>
                              
                              <button className="py-1.5 px-3 bg-white border border-neutral-200 rounded-md hover:border-neutral-300 transition-colors flex items-center gap-1.5">
                                <Image src="/folderIcon.svg" alt="" width={16} height={16} />
                                <span className="text-neutral-900 text-sm font-medium">Add from Vault project</span>
                              </button>
                              
                              <button 
                                className="py-1 px-3 bg-white border border-neutral-200 rounded-md hover:border-neutral-300 transition-colors"
                                onClick={() => {
                                  // Skip and send a follow-up message
                                  const skipMessage = "I don't have any documents to upload right now. Please proceed with creating a draft S-1 shell.";
                                  setInputValue(skipMessage);
                                  sendMessage(skipMessage);
                                }}
                              >
                                <span className="text-neutral-900 text-sm font-medium">Skip</span>
                              </button>
                                </div>
                              </div>
                        )}
                        
                        {/* Sources section for legal analysis */}
                        {message.content === 'legal-analysis' && (
                          <>
                            <p className="text-xs font-medium text-neutral-600 mt-4 pl-2">Sources</p>
                            <button 
                              className="flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1.5 max-w-full"
                              onClick={() => setSourcesDrawerOpen(true)}
                            >
                            {/* Facepile avatars */}
                            <div className="flex -space-x-1.5 flex-shrink-0">
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border-[1px] border-white overflow-hidden z-[3]">
                                <Image src="/lexis.svg" alt="LexisNexis" width={20} height={20} className="w-full h-full object-cover" />
                              </div>
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border-[1.5px] border-white overflow-hidden z-[2]">
                                <Image src="/EDGAR.svg" alt="EDGAR" width={20} height={20} className="w-full h-full object-cover" />
                              </div>
                              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border-[1.5px] border-white overflow-hidden z-[1]">
                                <Image src="/bloomberg.jpg" alt="Bloomberg" width={20} height={20} className="w-full h-full object-cover" />
                              </div>
                            </div>
                            <span className="truncate">6 sources from LexisNexis, EDGAR, and more</span>
                          </button>
                          </>
                        )}
                        {/* Ghost buttons for AI responses */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center">
                              <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                                <Copy className="w-3 h-3" />
                                Copy
                              </button>
                              <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                                <Download className="w-3 h-3" />
                                Export
                              </button>
                              <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                                <RotateCcw className="w-3 h-3" />
                                Rewrite
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button className="text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm p-1.5">
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button className="text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm p-1.5">
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                      </div>
                    )}
                            </motion.div>
                          </AnimatePresence>
                        )}
                      </>
                    )}
                    
                    {/* User message content */}
                    {message.role === 'user' && (
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                        {message.type === 'files' && message.filesData ? (
                          <div className="pl-2">
                            <div className="text-neutral-900 leading-relaxed mb-3">
                              I&apos;ve uploaded some files from iManage
                            </div>
                            <div className="border border-neutral-200 rounded-lg px-3 py-1">
                              <div className="space-y-0.5">
                              {message.filesData.slice(0, 4).map((file) => (
                                <div 
                                  key={file.id} 
                                  className="flex items-center gap-2 h-8 px-2 -mx-2 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer min-w-0"
                                >
                                  <div className="flex-shrink-0">
                                    {file.name.toLowerCase().endsWith('.pdf') ? (
                                      <Image src="/pdf-icon.svg" alt="PDF" width={16} height={16} />
                                    ) : file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') ? (
                                      <Image src="/docx-icon.svg" alt="DOCX" width={16} height={16} />
                                    ) : file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') ? (
                                      <Image src="/xlsx-icon.svg" alt="Spreadsheet" width={16} height={16} />
                                    ) : file.type === 'folder' ? (
                                      <Image src="/folderIcon.svg" alt="Folder" width={16} height={16} />
                                    ) : (
                                      <Image src="/file.svg" alt="File" width={16} height={16} />
                                    )}
                                  </div>
                                  <span className="text-sm text-neutral-900 truncate flex-1">{file.name}</span>
                                </div>
                              ))}
                              {message.filesData.length > 4 && (
                                <div className="flex items-center gap-2 h-8 px-2 -mx-2 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer">
                                  <div className="text-sm text-neutral-500">
                                    View {message.filesData.length - 4} more...
                                  </div>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-neutral-900 leading-relaxed pl-2">
                            {message.content}
                          </div>
                        )}
                        {/* Ghost buttons for user messages */}
                        <div className="flex items-center mt-2">
                          <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                            <Copy className="w-3 h-3" />
                            Copy
                          </button>
                          <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                            <ListPlus className="w-3 h-3" />
                            Save prompt
                          </button>
                          <button className="text-xs text-neutral-700 hover:text-neutral-800 hover:bg-neutral-100 transition-colors rounded-sm px-2 py-1 flex items-center gap-1.5">
                            <SquarePen className="w-3 h-3" />
                            Edit query
                          </button>
                        </div>
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              ))
            )}
            </div>
            </motion.div>
          </div>
          
          {/* Input Area - Animation simulating movement from center to bottom */}
          <motion.div 
            className="px-6 pb-6 overflow-x-hidden relative z-20 bg-white"
            initial={initialMessage && isFromHomepage && !hasPlayedAnimationsRef.current ? { y: "calc(-45vh + 120px)" } : {}}
            animate={{ y: 0 }}
            transition={initialMessage && isFromHomepage && !hasPlayedAnimationsRef.current ? { 
              duration: 0.8,
              ease: [0.4, 0.0, 0.2, 1]
            } : {}}
            onAnimationComplete={() => {
              // Mark animations as played after the main animation completes
              if (initialMessage && isFromHomepage && !hasPlayedAnimationsRef.current) {
                hasPlayedAnimationsRef.current = true;
              }
            }}
          >
            <div className="mx-auto" style={{ maxWidth: '832px' }}>
              <div className="pl-2 pr-3 pt-4 pb-3 transition-all duration-200 border border-transparent focus-within:border-neutral-300 bg-neutral-100 flex flex-col" style={{ borderRadius: '12px', minHeight: '160px' }}>
              {/* Textarea */}
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Request a revision or ask a question..."
                className="w-full bg-transparent focus:outline-none text-neutral-900 placeholder-neutral-500 resize-none overflow-hidden flex-1 px-2"
                style={{ 
                  fontSize: '14px', 
                  lineHeight: '20px',
                  minHeight: '60px',
                  maxHeight: '300px'
                }}
              />
              
              {/* Controls Row */}
              <div className="flex items-center justify-between mt-3" data-artifact-open={anyArtifactPanelOpen}>
                {/* Left Controls */}
                                  <div className="flex items-center">
                    {/* Files and sources */}
                    <button 
                      onClick={() => setIsFileManagementOpen(true)}
                      className={`flex items-center gap-1.5 h-8 px-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-200 rounded-md transition-colors`}
                    >
                      <Plus size={16} />
                      {!anyArtifactPanelOpen && <span className="text-sm font-normal">Files and sources</span>}
                    </button>
                  
                  {/* Prompts */}
                  <button className={`flex items-center gap-1.5 h-8 px-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-200 rounded-md transition-colors`}>
                    <ListPlus size={16} />
                    {!anyArtifactPanelOpen && <span className="text-sm font-normal">Prompts</span>}
                  </button>
                  
                  {/* Divider */}
                  <div className="w-px bg-neutral-200" style={{ height: '20px', marginLeft: '4px', marginRight: '4px' }}></div>
                  
                  {/* Customize */}
                  <button className={`flex items-center gap-1.5 h-8 px-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-200 rounded-md transition-colors`}>
                    <Settings2 size={16} />
                    {!anyArtifactPanelOpen && <span className="text-sm font-normal">Customize</span>}
                  </button>
                  
                  {/* Improve */}
                  <button className={`flex items-center gap-1.5 h-8 px-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-200 rounded-md transition-colors`}>
                    <Wand size={16} />
                    {!anyArtifactPanelOpen && <span className="text-sm font-normal">Improve</span>}
                  </button>
                </div>
                
                {/* Right Controls */}
                <div className="flex items-center space-x-2">
                  {/* Send Button */}
                  <button
                    onClick={() => sendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                    className={`p-2 focus:outline-none flex items-center justify-center transition-all bg-neutral-900 text-neutral-0 hover:bg-neutral-800 ${
                      !inputValue.trim() || isLoading ? 'cursor-not-allowed' : ''
                    }`}
                    style={{ 
                      minWidth: '32px', 
                      minHeight: '32px',
                      borderRadius: '6px',
                      opacity: !inputValue.trim() || isLoading ? 0.3 : 1
                    }}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <Spinner size="sm" />
                      </div>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            </div>
          </motion.div>
        </div>
        
        {/* Resizable Separator - Only show when artifact panel is open and chat is open */}
        {anyArtifactPanelOpen && chatOpen && (
          <div 
            className="relative group"
            onMouseEnter={() => setIsHoveringResizer(true)}
            onMouseLeave={() => setIsHoveringResizer(false)}
            onMouseDown={handleMouseDown}
            style={{
              width: (isPastCollapseThreshold || isPastExpandThreshold) 
                ? '3px' // Thicker when past threshold
                : (isHoveringResizer || isResizing ? '2px' : '1px'),
              backgroundColor: (isPastCollapseThreshold || isPastExpandThreshold) 
                ? '#262626' // neutral-800 when past threshold
                : (isHoveringResizer || isResizing ? '#d4d4d4' : '#e5e5e5'),
              cursor: 'col-resize',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {/* Invisible wider hit area for easier grabbing */}
            <div 
              className="absolute inset-y-0"
              style={{
                left: '-4px',
                right: '-4px',
                cursor: 'col-resize',
              }}
            />
          </div>
        )}
      </motion.div>
      )}
      </AnimatePresence>
      
      {/* Sources Panel - Shows as second panel when artifact is closed */}
      <AnimatePresence>
                  {sourcesDrawerOpen && !anyArtifactPanelOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{
              width: PANEL_ANIMATION,
              opacity: { duration: 0.15, ease: "easeOut" }
            }}
            className="h-full bg-white border-l border-neutral-200 flex flex-col overflow-hidden"
            style={{ 
              flexShrink: 0
            }}
          >
            {/* Header */}
            <div className="px-3 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ height: '52px' }}>
              <p className="text-neutral-900 font-medium truncate mr-4">Sources</p>
              <button
                onClick={() => setSourcesDrawerOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-md transition-colors"
              >
                <X size={16} className="text-neutral-600" />
              </button>
            </div>
            
            {/* Sources Content */}
            <SourcesDrawer 
              isOpen={true} 
              onClose={() => setSourcesDrawerOpen(false)}
              variant="panel"
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Unified Artifact Panel - Right Panel */}
      <AnimatePresence>
        {unifiedArtifactPanelOpen && currentArtifactType && (
          <>
            {currentArtifactType === 'draft' ? (
              <DraftArtifactPanel
                selectedArtifact={selectedDraftArtifact}
                isEditingArtifactTitle={isEditingDraftArtifactTitle}
                editedArtifactTitle={editedDraftArtifactTitle}
                onEditedArtifactTitleChange={setEditedDraftArtifactTitle}
                onStartEditingTitle={() => {
                  setIsEditingDraftArtifactTitle(true);
                  setEditedDraftArtifactTitle(selectedDraftArtifact?.title || 'Artifact');
                }}
                onSaveTitle={handleSaveDraftArtifactTitle}
                onClose={() => {
                  setUnifiedArtifactPanelOpen(false);
                  setDraftArtifactPanelOpen(false);
                  setSelectedDraftArtifact(null);
                  setCurrentArtifactType(null);
                }}
                chatOpen={chatOpen}
                onToggleChat={toggleChat}
                shareArtifactDialogOpen={shareArtifactDialogOpen}
                onShareArtifactDialogOpenChange={setShareArtifactDialogOpen}
                exportReviewDialogOpen={exportReviewDialogOpen}
                onExportReviewDialogOpenChange={setExportReviewDialogOpen}
                artifactTitleInputRef={draftArtifactTitleInputRef}
                sourcesDrawerOpen={sourcesDrawerOpen}
                onSourcesDrawerOpenChange={setSourcesDrawerOpen}
              />
            ) : null}
          </>
        )}
      </AnimatePresence>


      
      {/* Sources Panel - Shows as third panel when artifact is open and above 2xl */}
      <AnimatePresence>
        {sourcesDrawerOpen && (artifactPanelOpen || draftArtifactPanelOpen) && isAbove2xl && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 400, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{
              width: PANEL_ANIMATION,
              opacity: { duration: 0.15, ease: "easeOut" }
            }}
            className="h-full bg-white border-l border-neutral-200 flex flex-col overflow-hidden"
            style={{ 
              flexShrink: 0
            }}
          >
            {/* Header */}
            <div className="px-3 py-4 border-b border-neutral-200 flex items-center justify-between" style={{ height: '52px' }}>
              <p className="text-neutral-900 font-medium truncate mr-4">Sources</p>
              <button
                onClick={() => setSourcesDrawerOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-md transition-colors"
              >
                <X size={16} className="text-neutral-600" />
              </button>
            </div>
            
            {/* Sources Content */}
            <SourcesDrawer 
              isOpen={true} 
              onClose={() => setSourcesDrawerOpen(false)}
              variant="panel"
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sources Drawer - Sheet variant when artifact panel is open and below 2xl */}
      <AnimatePresence>
        {(artifactPanelOpen || draftArtifactPanelOpen) && !isAbove2xl && (
          <SourcesDrawer 
            isOpen={sourcesDrawerOpen} 
            onClose={() => setSourcesDrawerOpen(false)}
            variant="sheet"
            isLoading={isLoading}
          />
        )}
      </AnimatePresence>
      
      {/* Share Dialogs */}
      <ShareThreadDialog 
        isOpen={shareThreadDialogOpen} 
        onClose={() => setShareThreadDialogOpen(false)} 
      />
      <ShareArtifactDialog 
        isOpen={shareArtifactDialogOpen} 
        onClose={() => setShareArtifactDialogOpen(false)} 
        artifactTitle={selectedArtifact?.title || "Artifact"}
      />
      
      {/* Export Dialogs */}
      <ExportThreadDialog 
        isOpen={exportThreadDialogOpen} 
        onClose={() => setExportThreadDialogOpen(false)} 
      />
      <ExportReviewDialog 
        isOpen={exportReviewDialogOpen} 
        onClose={() => setExportReviewDialogOpen(false)} 
        artifactTitle={selectedArtifact?.title || "Review"}
      />
      <FileManagementDialog 
        isOpen={isFileManagementOpen} 
        onClose={() => setIsFileManagementOpen(false)} 
      />
      <IManageFilePickerDialog 
        isOpen={isiManagePickerOpen} 
        onClose={() => setIsiManagePickerOpen(false)} 
        onFilesSelected={(files) => {
          // Set loading state immediately
          setIsLoading(true);
          
          // Add the files as a user message
          setMessages(prev => [...prev, {
            role: 'user' as const,
            content: '',
            type: 'files' as const,
            filesData: files
          }]);

          
          // Scroll to bottom
          setTimeout(() => {
            messagesContainerRef.current?.scrollTo({
              top: messagesContainerRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);

          // Add AI response with thinking states after a delay
          setTimeout(() => {
            // Get thinking content for file processing
            const thinkingContent = {
              summary: "The user has uploaded documents that I need to process and review thoroughly. I'll analyze each document to extract key information, identify relevant sections for S-1 filing requirements that will be essential for drafting a comprehensive S-1 statement.",
              bullets: [
                "Understand the business structure and financials",
                "Locate risk factors and material agreements", 
                "Compile insights for risk"
              ],
              additionalText: ""
            };

            // Initialize loading state
            const loadingState = {
              showSummary: false,
              visibleBullets: 0,
              showAdditionalText: false
            };

            // Add assistant message with thinking states
            const assistantMessage = {
              role: 'assistant' as const,
              content: '',
              type: 'text' as const,
              thinkingContent,
              loadingState,
              isLoading: true
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Scroll to bottom
            setTimeout(() => {
              messagesContainerRef.current?.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
              });
            }, 100);

            // Progressive reveal of thinking states
            // Show the summary first
            setTimeout(() => {
              setMessages(prev => prev.map((msg, idx) => 
                idx === prev.length - 1 && msg.role === 'assistant' && msg.isLoading && msg.loadingState
                  ? { ...msg, loadingState: { ...msg.loadingState, showSummary: true } }
                  : msg
              ));
              scrollToBottom();
            }, 600);
            
            // Then show bullets progressively
            thinkingContent.bullets.forEach((_, bulletIdx) => {
              setTimeout(() => {
                setMessages(prev => prev.map((msg, idx) => 
                  idx === prev.length - 1 && msg.role === 'assistant' && msg.isLoading && msg.loadingState
                    ? { ...msg, loadingState: { ...msg.loadingState, visibleBullets: bulletIdx + 1 } }
                    : msg
                ));
                scrollToBottom();
              }, 1000 + (bulletIdx * 400));
            });

            // After thinking completes, show the actual response
            setTimeout(() => {
              setMessages(prev => prev.map((msg, idx) => {
                if (idx === prev.length - 1 && msg.role === 'assistant' && msg.isLoading) {
                  return {
                    ...msg,
                    content: `Thank you for uploading the files. I'm currently processing and reviewing the documents to understand their content and context. I'll provide you with a summary and insights shortly.`,
                    isLoading: false,
                    loadingState: undefined,
                    // Don't show file review immediately, we'll add it with animation
                    showFileReview: false
                  };
                }
                return msg;
              }));

              // Final scroll
              setTimeout(() => {
                messagesContainerRef.current?.scrollTo({
                  top: messagesContainerRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }, 100);
              
              // Show file review thinking state after a delay
              setTimeout(() => {
                // First, get the files to review
                let reviewFiles: Array<{name: string, type: 'pdf' | 'docx' | 'spreadsheet' | 'folder' | 'text'}> = [];
                let uploadedFilesCount = 0;
                
                setMessages(prev => {
                  // Find the user file message from the current state
                  const userFileMsg = prev.find((msg, i) => 
                    i === prev.length - 2 && msg.role === 'user' && msg.type === 'files' && msg.filesData
                  );
                  
                  const uploadedFiles = userFileMsg?.filesData || files || [];
                  uploadedFilesCount = uploadedFiles.length;
                  
                  // Convert uploaded files to the format needed for file review
                  reviewFiles = uploadedFiles.length > 0 ? uploadedFiles.slice(0, 9).map(file => {
                    const fileName = file.name.toLowerCase();
                    let fileType: 'pdf' | 'docx' | 'spreadsheet' | 'folder' | 'text' = 'text';
                    
                    // Check if it's a folder first
                    if (file.type === 'folder') {
                      fileType = 'folder';
                    } else if (fileName.endsWith('.pdf')) {
                      fileType = 'pdf';
                    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
                      fileType = 'docx';
                    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                      fileType = 'spreadsheet';
                    } else if (fileName.endsWith('.txt') || file.type === 'file') {
                      fileType = 'text';
                    }
                    
                    return {
                      name: file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name,
                      type: fileType
                    };
                  }) : [];
                  
                  return prev.map((msg, idx) => {
                    if (idx === prev.length - 1 && msg.role === 'assistant') {
                      return {
                        ...msg,
                        showFileReview: true,
                        fileReviewContent: {
                          summary: "I will review all the uploaded documents to extract key information needed for the S-1 registration statement, including business operations, financial data, risk factors, and material agreements.",
                          files: reviewFiles,
                          totalFiles: uploadedFilesCount
                        },
                      fileReviewLoadingState: {
                        isLoading: true,
                        loadedFiles: 0
                      }
                    };
                  }
                  return msg;
                  });
                });
                  
                // Scroll after file review appears
                setTimeout(() => {
                  messagesContainerRef.current?.scrollTo({
                    top: messagesContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                  });
                }, 100);
                  
                // Progressively load each file from the actual uploaded files
                reviewFiles.forEach((_, fileIdx) => {
                  setTimeout(() => {
                    setMessages(prev => prev.map((msg, idx) => {
                      if (idx === prev.length - 1 && msg.role === 'assistant' && msg.fileReviewLoadingState) {
                        return {
                          ...msg,
                          fileReviewLoadingState: {
                            ...msg.fileReviewLoadingState,
                            loadedFiles: fileIdx + 1
                          }
                        };
                      }
                      return msg;
                    }));
                  }, 1000 + (fileIdx * 300)); // Load each file every 300ms
                });
                  
                // After all files are loaded, complete the review
                const reviewFileCount = reviewFiles.length;
                const reviewFilesCompleteDelay = 1000 + (reviewFileCount * 300) + 500;
                setTimeout(() => {
                  setMessages(prev => prev.map((msg, idx) => {
                    if (idx === prev.length - 1 && msg.role === 'assistant') {
                      return {
                        ...msg,
                        fileReviewLoadingState: {
                          isLoading: false,
                          loadedFiles: reviewFileCount
                        }
                      };
                    }
                    return msg;
                  }));
                  
                  // Scroll after file review completes
                  setTimeout(() => {
                    messagesContainerRef.current?.scrollTo({
                      top: messagesContainerRef.current.scrollHeight,
                      behavior: 'smooth'
                    });
                  }, 100);
                  
                  // Show draft generation thinking state after a delay
                  setTimeout(() => {
                    setMessages(prev => prev.map((msg, idx) => {
                      if (idx === prev.length - 1 && msg.role === 'assistant') {
                        return {
                          ...msg,
                          showDraftGeneration: true,
                          draftGenerationLoadingState: {
                            isLoading: true,
                            showSummary: false,
                            visibleBullets: 0
                          }
                        };
                      }
                      return msg;
                    }));
                    
                    // Scroll to show draft generation
                    setTimeout(() => {
                      messagesContainerRef.current?.scrollTo({
                        top: messagesContainerRef.current.scrollHeight,
                        behavior: 'smooth'
                      });
                    }, 100);
                    
                    // Progressive reveal of draft generation content
                    // Show summary after 600ms
                    setTimeout(() => {
                      setMessages(prev => prev.map((msg, idx) => {
                        if (idx === prev.length - 1 && msg.role === 'assistant' && msg.draftGenerationLoadingState?.isLoading) {
                          return {
                            ...msg,
                            draftGenerationLoadingState: {
                              ...msg.draftGenerationLoadingState,
                              showSummary: true
                            }
                          };
                        }
                        return msg;
                      }));
                    }, 600);
                    
                    // Show bullets progressively
                    const draftBullets = getThinkingContent('draft').bullets;
                    draftBullets.forEach((_, bulletIdx) => {
                      setTimeout(() => {
                        setMessages(prev => prev.map((msg, idx) => {
                          if (idx === prev.length - 1 && msg.role === 'assistant' && msg.draftGenerationLoadingState?.isLoading) {
                            return {
                              ...msg,
                              draftGenerationLoadingState: {
                                ...msg.draftGenerationLoadingState,
                                visibleBullets: bulletIdx + 1
                              }
                            };
                          }
                          return msg;
                        }));
                      }, 1200 + (bulletIdx * 400)); // Start at 1.2s, then 400ms between each bullet
                    });
                    
                    // Complete draft generation after some time
                    setTimeout(() => {
                      setMessages(prev => prev.map((msg, idx) => {
                        if (idx === prev.length - 1 && msg.role === 'assistant') {
                          return {
                            ...msg,
                            artifactData: {
                              title: "ValarAI S-1 Statement Shell",
                              subtitle: "Draft document with key sections and placeholders",
                              variant: 'draft'
                            },
                            draftGenerationLoadingState: {
                              isLoading: false,
                              showSummary: true,
                              visibleBullets: getThinkingContent('draft').bullets.length
                            }
                          };
                        }
                        return msg;
                      }));
                      
                      // Automatically open the draft artifact panel after a delay
                      setTimeout(() => {
                        setSelectedDraftArtifact({
                          title: "ValarAI S-1 Statement Shell",
                          subtitle: "Draft document with key sections and placeholders"
                        });
                        setCurrentArtifactType('draft');
                        setUnifiedArtifactPanelOpen(true);
                      }, 800); // Delay to let artifact card appear and animate first
                      
                      // Final set loading to false
                      setTimeout(() => {
                        setIsLoading(false);
                      }, 1200); // After panel opens
                    }, 4000); // 4 seconds for draft generation
                  }, 800); // Show draft generation 800ms after file review completes
                }, reviewFilesCompleteDelay); // After all files + buffer
              }, 600); // Show file review state 600ms after content appears
            }, 2400); // Total time for thinking states to complete (summary + 3 bullets)
          }, 1000);
        }}
      />
        </div>
      </SidebarInset>
    </div>
  );
} 